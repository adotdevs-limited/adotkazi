import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export function findOrganizationBySlug(slug: string) {
  return prisma.organization.findUnique({ where: { slug } });
}

export function isSlugTaken(slug: string): Promise<boolean> {
  return prisma.organization
    .findUnique({ where: { slug }, select: { id: true } })
    .then((org) => org !== null);
}

export function createOrganizationRecord(
  tx: Prisma.TransactionClient,
  data: {
    name: string;
    slug: string;
    country: string;
    timezone: string;
    createdBy: string;
  },
) {
  return tx.organization.create({
    data: {
      name: data.name,
      slug: data.slug,
      country: data.country,
      timezone: data.timezone,
      status: "TRIAL",
      createdBy: data.createdBy,
      updatedBy: data.createdBy,
      settings: { create: {} },
    },
  });
}

export function listOrganizationsForUser(userId: string) {
  return prisma.membership.findMany({
    where: { userId, status: "ACTIVE", deletedAt: null, organization: { deletedAt: null } },
    include: { organization: true, role: true },
    orderBy: { lastActiveAt: "desc" },
  });
}
