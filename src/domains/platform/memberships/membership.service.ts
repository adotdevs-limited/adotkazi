import "server-only";
import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/db";
import { recordAuditEvent } from "@/domains/platform/audit/audit.service";
import { requirePermission, type ActiveMembership } from "@/domains/platform/authorization/policy";
import type { InviteMemberInput } from "./membership.schema";
import { findActiveMembershipByEmail, findPendingInvitation } from "./membership.repository";

const INVITATION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export class AlreadyMemberError extends Error {
  constructor() {
    super("This person is already a member of your organization.");
    this.name = "AlreadyMemberError";
  }
}

export class AlreadyInvitedError extends Error {
  constructor() {
    super("An invitation is already pending for this email address.");
    this.name = "AlreadyInvitedError";
  }
}

export async function inviteMember(
  membership: ActiveMembership,
  input: InviteMemberInput,
): Promise<{ token: string }> {
  requirePermission(membership, "membership.invite");

  const email = input.email.toLowerCase();

  if (await findActiveMembershipByEmail(membership.organizationId, email)) {
    throw new AlreadyMemberError();
  }
  if (await findPendingInvitation(membership.organizationId, email)) {
    throw new AlreadyInvitedError();
  }

  const token = randomBytes(32).toString("hex");

  await prisma.$transaction(async (tx) => {
    const invitation = await tx.invitation.create({
      data: {
        organizationId: membership.organizationId,
        email,
        roleId: input.roleId,
        invitedById: membership.userId,
        token,
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      },
    });

    await recordAuditEvent(
      {
        organizationId: membership.organizationId,
        actorUserId: membership.userId,
        entityType: "Invitation",
        entityId: invitation.id,
        action: "membership.invited",
        after: { email },
      },
      tx,
    );
  });

  // Email delivery lands with the Communication/Notification infrastructure
  // milestone (ARCHITECTURE.txt "Notification Architecture"). Until then the
  // inviter shares the invite link manually.
  return { token };
}

export async function acceptInvitation(
  userId: string,
  userEmail: string,
  token: string,
): Promise<{ organizationId: string; organizationSlug: string }> {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: true },
  });

  if (!invitation || invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
    throw new Error("This invitation is no longer valid.");
  }

  if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
    throw new Error("This invitation was sent to a different email address.");
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId,
        },
      },
    });

    if (existing) {
      await tx.membership.update({
        where: { id: existing.id },
        data: { status: "ACTIVE", deletedAt: null, joinedAt: existing.joinedAt ?? new Date() },
      });
    } else {
      await tx.membership.create({
        data: {
          organizationId: invitation.organizationId,
          userId,
          roleId: invitation.roleId,
          status: "ACTIVE",
          invitedBy: invitation.invitedById,
          joinedAt: new Date(),
          lastActiveAt: new Date(),
        },
      });
    }

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    await recordAuditEvent(
      {
        organizationId: invitation.organizationId,
        actorUserId: userId,
        entityType: "Membership",
        entityId: invitation.organizationId,
        action: "membership.accepted",
        after: { email: invitation.email },
      },
      tx,
    );
  });

  return {
    organizationId: invitation.organizationId,
    organizationSlug: invitation.organization.slug,
  };
}
