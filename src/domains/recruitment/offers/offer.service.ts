import "server-only";

import type { Offer } from "@/generated/prisma/client";
import { recordAuditEvent } from "@/domains/platform/audit/audit.service";
import type { CurrentUser } from "@/domains/platform/tenancy/active-organization";
import { requirePermission, type ActiveMembership } from "@/domains/platform/authorization/policy";
import {
  findApplicationById,
  updateApplicationStatus,
} from "@/domains/recruitment/applications/application.repository";
import { ApplicationNotFoundError } from "@/domains/recruitment/applications/application.service";
import { sendEmail } from "@/lib/email/send-email";
import type { ExtendOfferInput } from "./offer.schema";
import {
  createOffer,
  findActiveOfferForApplication,
  findOfferById,
  listOffersForApplication,
  updateOfferStatus,
} from "./offer.repository";

export class OfferAlreadyActiveError extends Error {
  constructor() {
    super("This application already has an active offer. Withdraw it before sending a new one.");
    this.name = "OfferAlreadyActiveError";
  }
}

export class OfferNotFoundError extends Error {
  constructor() {
    super("That offer could not be found.");
    this.name = "OfferNotFoundError";
  }
}

export class OfferNotActionableError extends Error {
  constructor() {
    super("This offer has already been resolved.");
    this.name = "OfferNotActionableError";
  }
}

export class OfferExpiredError extends Error {
  constructor() {
    super("This offer has expired.");
    this.name = "OfferExpiredError";
  }
}

async function loadApplicationInOrganizationOrThrow(applicationId: string, organizationId: string) {
  const application = await findApplicationById(applicationId);
  if (!application || application.opportunity.organizationId !== organizationId) {
    throw new ApplicationNotFoundError();
  }
  return application;
}

export async function extendOffer(
  membership: ActiveMembership,
  applicationId: string,
  input: ExtendOfferInput,
): Promise<Offer> {
  requirePermission(membership, "application.update");

  const application = await loadApplicationInOrganizationOrThrow(
    applicationId,
    membership.organizationId,
  );

  const activeOffer = await findActiveOfferForApplication(applicationId);
  if (activeOffer) {
    throw new OfferAlreadyActiveError();
  }

  const offer = await createOffer({ applicationId, ...input });

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "Offer",
    entityId: offer.id,
    action: "offer.sent",
    after: { salary: input.salary ?? null, currency: input.currency ?? null },
  });

  try {
    await sendEmail({
      to: application.candidate.user.email,
      subject: `You've received an offer for ${application.opportunity.title}`,
      body: [
        `Hi ${application.candidate.user.name},`,
        "",
        `${application.opportunity.organization.name} has extended you an offer for ${application.opportunity.title}.`,
        input.salary ? `Salary: ${input.salary} ${input.currency ?? ""}`.trim() : null,
        input.startDate ? `Start date: ${input.startDate.toLocaleDateString()}` : null,
        input.expiresAt ? `Please respond by ${input.expiresAt.toLocaleDateString()}.` : null,
        "",
        "Sign in to AdotKazi to accept or decline this offer.",
      ]
        .filter((line) => line !== null)
        .join("\n"),
    });
  } catch {
    // The offer is already recorded; a notification failure shouldn't roll it back.
  }

  return offer;
}

export async function withdrawOffer(membership: ActiveMembership, offerId: string): Promise<Offer> {
  requirePermission(membership, "application.update");

  const offer = await findOfferById(offerId);
  if (!offer || offer.application.organizationId !== membership.organizationId) {
    throw new OfferNotFoundError();
  }
  if (offer.status !== "SENT") {
    throw new OfferNotActionableError();
  }

  const updated = await updateOfferStatus(offerId, "WITHDRAWN", { withdrawnAt: new Date() });

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "Offer",
    entityId: offerId,
    action: "offer.withdrawn",
  });

  return updated;
}

export async function getOfferForCandidate(user: CurrentUser, applicationId: string) {
  const application = await findApplicationById(applicationId);
  if (!application || application.candidate.userId !== user.id) {
    throw new ApplicationNotFoundError();
  }

  const offers = await listOffersForApplication(applicationId);
  return { application, offer: offers[0] ?? null };
}

export async function respondToOffer(
  user: CurrentUser,
  offerId: string,
  response: "ACCEPTED" | "DECLINED",
): Promise<Offer> {
  const offer = await findOfferById(offerId);
  if (!offer || offer.application.candidate.userId !== user.id) {
    throw new OfferNotFoundError();
  }
  if (offer.status !== "SENT") {
    throw new OfferNotActionableError();
  }
  if (offer.expiresAt && offer.expiresAt < new Date()) {
    await updateOfferStatus(offerId, "EXPIRED", {});
    throw new OfferExpiredError();
  }

  const timestamp = new Date();
  const updated = await updateOfferStatus(
    offerId,
    response,
    response === "ACCEPTED" ? { acceptedAt: timestamp } : { declinedAt: timestamp },
  );

  if (response === "ACCEPTED") {
    await updateApplicationStatus(offer.application.id, "HIRED");
  }

  await recordAuditEvent({
    organizationId: offer.application.organizationId,
    actorUserId: user.id,
    entityType: "Offer",
    entityId: offerId,
    action: response === "ACCEPTED" ? "offer.accepted" : "offer.declined",
  });

  return updated;
}

export function acceptOffer(user: CurrentUser, offerId: string) {
  return respondToOffer(user, offerId, "ACCEPTED");
}

export function declineOffer(user: CurrentUser, offerId: string) {
  return respondToOffer(user, offerId, "DECLINED");
}
