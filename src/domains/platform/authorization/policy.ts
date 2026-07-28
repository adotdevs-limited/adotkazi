import "server-only";

import { prisma } from "@/lib/db";
import type { PermissionKey } from "./permissions";

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export type ActiveMembership = {
  membershipId: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  userId: string;
  roleId: string;
  roleName: string;
  permissions: Set<PermissionKey>;
};

/**
 * Loads the membership record for `userId` within `organizationId`, along
 * with its resolved permission set. Returns null if the user has no active
 * membership in that organization — callers must treat that as "no access,"
 * never fall back to a different organization.
 */
export async function loadActiveMembership(
  userId: string,
  organizationId: string,
): Promise<ActiveMembership | null> {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      organizationId,
      status: "ACTIVE",
      deletedAt: null,
    },
    include: {
      organization: true,
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });

  if (!membership || membership.organization.deletedAt) {
    return null;
  }

  return {
    membershipId: membership.id,
    organizationId: membership.organizationId,
    organizationName: membership.organization.name,
    organizationSlug: membership.organization.slug,
    userId: membership.userId,
    roleId: membership.roleId,
    roleName: membership.role.name,
    permissions: new Set(
      membership.role.permissions.map((rp) => rp.permission.key as PermissionKey),
    ),
  };
}

export function can(membership: ActiveMembership, permission: PermissionKey): boolean {
  return membership.permissions.has(permission);
}

/** Throws {@link ForbiddenError} unless `membership` grants `permission`. */
export function requirePermission(membership: ActiveMembership, permission: PermissionKey): void {
  if (!can(membership, permission)) {
    throw new ForbiddenError();
  }
}
