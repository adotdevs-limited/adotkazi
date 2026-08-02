import "server-only";

import { prisma } from "@/lib/db";

export function listBranchesForOrganization(organizationId: string) {
  return prisma.branch.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { name: "asc" },
  });
}

export function listBranchesWithOpportunityCounts(organizationId: string) {
  return prisma.branch.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { opportunities: true } } },
  });
}

export function findBranchById(id: string, organizationId: string) {
  return prisma.branch.findFirst({ where: { id, organizationId, deletedAt: null } });
}

export function countOpportunitiesForBranch(branchId: string) {
  return prisma.opportunity.count({ where: { branchId } });
}

export type BranchRecordInput = {
  name: string;
  code?: string;
  address?: string;
  city?: string;
  country?: string;
  isHeadquarters: boolean;
  status: "ACTIVE" | "INACTIVE";
};

export function createBranchRecord(
  organizationId: string,
  data: BranchRecordInput & { createdBy: string },
) {
  return prisma.branch.create({
    data: {
      organizationId,
      name: data.name,
      code: data.code,
      address: data.address,
      city: data.city,
      country: data.country,
      isHeadquarters: data.isHeadquarters,
      status: data.status,
      createdBy: data.createdBy,
      updatedBy: data.createdBy,
    },
  });
}

export function updateBranchRecord(id: string, data: BranchRecordInput & { updatedBy: string }) {
  return prisma.branch.update({
    where: { id },
    data: {
      name: data.name,
      code: data.code ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      country: data.country ?? null,
      isHeadquarters: data.isHeadquarters,
      status: data.status,
      updatedBy: data.updatedBy,
    },
  });
}

export function softDeleteBranchRecord(id: string, deletedBy: string) {
  return prisma.branch.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy },
  });
}
