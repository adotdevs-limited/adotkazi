import "server-only";

import type { Branch } from "@/generated/prisma/client";
import { recordAuditEvent } from "@/domains/platform/audit/audit.service";
import { requirePermission, type ActiveMembership } from "@/domains/platform/authorization/policy";
import type { BranchInput } from "./branch.schema";
import {
  countOpportunitiesForBranch,
  createBranchRecord,
  findBranchById,
  softDeleteBranchRecord,
  updateBranchRecord,
} from "./branch.repository";

export class BranchNotFoundError extends Error {
  constructor() {
    super("That branch could not be found.");
    this.name = "BranchNotFoundError";
  }
}

export class BranchInUseError extends Error {
  constructor() {
    super("This branch is used by one or more opportunities and can't be deleted.");
    this.name = "BranchInUseError";
  }
}

async function loadBranchOrThrow(id: string, organizationId: string): Promise<Branch> {
  const branch = await findBranchById(id, organizationId);
  if (!branch) {
    throw new BranchNotFoundError();
  }
  return branch;
}

export async function createBranch(
  membership: ActiveMembership,
  input: BranchInput,
): Promise<Branch> {
  requirePermission(membership, "branch.manage");

  const branch = await createBranchRecord(membership.organizationId, {
    ...input,
    createdBy: membership.userId,
  });

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "Branch",
    entityId: branch.id,
    action: "branch.created",
    after: { name: branch.name },
  });

  return branch;
}

export async function updateBranch(
  membership: ActiveMembership,
  id: string,
  input: BranchInput,
): Promise<Branch> {
  requirePermission(membership, "branch.manage");

  const existing = await loadBranchOrThrow(id, membership.organizationId);
  const updated = await updateBranchRecord(id, { ...input, updatedBy: membership.userId });

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "Branch",
    entityId: id,
    action: "branch.updated",
    before: { name: existing.name },
    after: { name: updated.name },
  });

  return updated;
}

export async function deleteBranch(membership: ActiveMembership, id: string): Promise<void> {
  requirePermission(membership, "branch.manage");

  const existing = await loadBranchOrThrow(id, membership.organizationId);
  if ((await countOpportunitiesForBranch(id)) > 0) {
    throw new BranchInUseError();
  }

  await softDeleteBranchRecord(id, membership.userId);

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "Branch",
    entityId: id,
    action: "branch.deleted",
    before: { name: existing.name },
  });
}
