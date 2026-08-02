import "server-only";

import { prisma } from "@/lib/db";

export function listDepartmentsForOrganization(organizationId: string) {
  return prisma.department.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { name: "asc" },
  });
}

export function listDepartmentsWithOpportunityCounts(organizationId: string) {
  return prisma.department.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { opportunities: true } } },
  });
}

export function findDepartmentById(id: string, organizationId: string) {
  return prisma.department.findFirst({ where: { id, organizationId, deletedAt: null } });
}

export function isDepartmentNameTaken(organizationId: string, name: string, excludeId?: string) {
  return prisma.department
    .findFirst({
      where: { organizationId, name, deletedAt: null, id: excludeId ? { not: excludeId } : undefined },
      select: { id: true },
    })
    .then(Boolean);
}

export function countOpportunitiesForDepartment(departmentId: string) {
  return prisma.opportunity.count({ where: { departmentId } });
}

export function createDepartmentRecord(
  organizationId: string,
  data: { name: string; description?: string; color?: string; createdBy: string },
) {
  return prisma.department.create({
    data: {
      organizationId,
      name: data.name,
      description: data.description,
      color: data.color,
      createdBy: data.createdBy,
      updatedBy: data.createdBy,
    },
  });
}

export function updateDepartmentRecord(
  id: string,
  data: { name: string; description?: string; color?: string; updatedBy: string },
) {
  return prisma.department.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description ?? null,
      color: data.color ?? null,
      updatedBy: data.updatedBy,
    },
  });
}

export function softDeleteDepartmentRecord(id: string, deletedBy: string) {
  return prisma.department.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy },
  });
}
