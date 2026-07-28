import "server-only";

import { prisma } from "@/lib/db";

export function listMembers(organizationId: string) {
  return prisma.membership.findMany({
    where: { organizationId, deletedAt: null },
    include: { user: true, role: true },
    orderBy: { createdAt: "asc" },
  });
}

export function listAssignableRoles(organizationId: string) {
  return prisma.role.findMany({
    where: { OR: [{ organizationId: null }, { organizationId }] },
    orderBy: { name: "asc" },
  });
}

export function findPendingInvitation(organizationId: string, email: string) {
  return prisma.invitation.findFirst({
    where: {
      organizationId,
      email: email.toLowerCase(),
      status: "PENDING",
    },
  });
}

export function findActiveMembershipByEmail(organizationId: string, email: string) {
  return prisma.membership.findFirst({
    where: {
      organizationId,
      status: "ACTIVE",
      deletedAt: null,
      user: { email: email.toLowerCase() },
    },
  });
}

export function findInvitationByToken(token: string) {
  return prisma.invitation.findUnique({
    where: { token },
    include: { organization: true, role: true },
  });
}
