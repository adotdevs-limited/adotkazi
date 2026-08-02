import "server-only";

import type { Department } from "@/generated/prisma/client";
import { recordAuditEvent } from "@/domains/platform/audit/audit.service";
import { requirePermission, type ActiveMembership } from "@/domains/platform/authorization/policy";
import type { DepartmentInput } from "./department.schema";
import {
  countOpportunitiesForDepartment,
  createDepartmentRecord,
  findDepartmentById,
  isDepartmentNameTaken,
  softDeleteDepartmentRecord,
  updateDepartmentRecord,
} from "./department.repository";

export class DepartmentNotFoundError extends Error {
  constructor() {
    super("That department could not be found.");
    this.name = "DepartmentNotFoundError";
  }
}

export class DepartmentNameTakenError extends Error {
  constructor() {
    super("A department with that name already exists in this organization.");
    this.name = "DepartmentNameTakenError";
  }
}

export class DepartmentInUseError extends Error {
  constructor() {
    super("This department is used by one or more opportunities and can't be deleted.");
    this.name = "DepartmentInUseError";
  }
}

async function loadDepartmentOrThrow(id: string, organizationId: string): Promise<Department> {
  const department = await findDepartmentById(id, organizationId);
  if (!department) {
    throw new DepartmentNotFoundError();
  }
  return department;
}

export async function createDepartment(
  membership: ActiveMembership,
  input: DepartmentInput,
): Promise<Department> {
  requirePermission(membership, "department.manage");

  if (await isDepartmentNameTaken(membership.organizationId, input.name)) {
    throw new DepartmentNameTakenError();
  }

  const department = await createDepartmentRecord(membership.organizationId, {
    ...input,
    createdBy: membership.userId,
  });

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "Department",
    entityId: department.id,
    action: "department.created",
    after: { name: department.name },
  });

  return department;
}

export async function updateDepartment(
  membership: ActiveMembership,
  id: string,
  input: DepartmentInput,
): Promise<Department> {
  requirePermission(membership, "department.manage");

  const existing = await loadDepartmentOrThrow(id, membership.organizationId);
  if (
    input.name !== existing.name &&
    (await isDepartmentNameTaken(membership.organizationId, input.name, id))
  ) {
    throw new DepartmentNameTakenError();
  }

  const updated = await updateDepartmentRecord(id, { ...input, updatedBy: membership.userId });

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "Department",
    entityId: id,
    action: "department.updated",
    before: { name: existing.name },
    after: { name: updated.name },
  });

  return updated;
}

export async function deleteDepartment(membership: ActiveMembership, id: string): Promise<void> {
  requirePermission(membership, "department.manage");

  const existing = await loadDepartmentOrThrow(id, membership.organizationId);
  if ((await countOpportunitiesForDepartment(id)) > 0) {
    throw new DepartmentInUseError();
  }

  await softDeleteDepartmentRecord(id, membership.userId);

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "Department",
    entityId: id,
    action: "department.deleted",
    before: { name: existing.name },
  });
}
