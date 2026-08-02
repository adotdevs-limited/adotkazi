import "server-only";

import type { Opportunity, OpportunityStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { recordAuditEvent } from "@/domains/platform/audit/audit.service";
import { requirePermission, type ActiveMembership } from "@/domains/platform/authorization/policy";
import type { PermissionKey } from "@/domains/platform/authorization/permissions";
import {
  findDefaultPipeline,
  findPipelineById,
} from "@/domains/recruitment/pipelines/pipeline.repository";
import type { CreateOpportunityInput, UpdateOpportunityInput } from "./opportunity.schema";
import {
  createOpportunityRecord,
  findOpportunityById,
  findOrCreateSkillsByName,
  isOpportunitySlugTaken,
  replaceSkillRequirements,
  softDeleteOpportunity,
  updateOpportunityRecord,
  updateOpportunityStatus,
} from "./opportunity.repository";

export class OpportunitySlugTakenError extends Error {
  constructor() {
    super("That URL slug is already taken in this organization. Try a different one.");
    this.name = "OpportunitySlugTakenError";
  }
}

export class OpportunityNotFoundError extends Error {
  constructor() {
    super("That opportunity could not be found.");
    this.name = "OpportunityNotFoundError";
  }
}

export class InvalidOpportunityStatusTransitionError extends Error {
  constructor(from: OpportunityStatus, to: OpportunityStatus) {
    super(
      from === to
        ? `Cannot edit an opportunity that is ${from}.`
        : `Cannot move an opportunity from ${from} to ${to}.`,
    );
    this.name = "InvalidOpportunityStatusTransitionError";
  }
}

async function requireDepartmentInOrganization(departmentId: string, organizationId: string) {
  const department = await prisma.department.findFirst({
    where: { id: departmentId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!department) {
    throw new Error("Selected department does not belong to this organization.");
  }
}

/** Validates an explicit pipelineId, or resolves the org's default pipeline. */
async function resolvePipelineId(
  pipelineId: string | undefined,
  organizationId: string,
): Promise<string> {
  if (pipelineId) {
    const pipeline = await findPipelineById(pipelineId, organizationId);
    if (!pipeline) {
      throw new Error("Selected pipeline does not belong to this organization.");
    }
    return pipeline.id;
  }

  const defaultPipeline = await findDefaultPipeline(organizationId);
  if (!defaultPipeline) {
    throw new Error("This organization has no default recruitment pipeline configured.");
  }
  return defaultPipeline.id;
}

function parseSkillNames(skills: string | undefined): string[] {
  if (!skills) return [];
  return [
    ...new Set(
      skills
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  ];
}

async function loadOpportunityOrThrow(id: string, organizationId: string) {
  const opportunity = await findOpportunityById(id, organizationId);
  if (!opportunity) {
    throw new OpportunityNotFoundError();
  }
  return opportunity;
}

export async function createOpportunity(
  membership: ActiveMembership,
  input: CreateOpportunityInput,
): Promise<Opportunity> {
  requirePermission(membership, "opportunity.create");

  if (await isOpportunitySlugTaken(membership.organizationId, input.slug)) {
    throw new OpportunitySlugTakenError();
  }
  await requireDepartmentInOrganization(input.departmentId, membership.organizationId);
  const pipelineId = await resolvePipelineId(input.pipelineId, membership.organizationId);

  return prisma.$transaction(async (tx) => {
    const opportunity = await createOpportunityRecord(tx, {
      organizationId: membership.organizationId,
      departmentId: input.departmentId,
      branchId: input.branchId,
      hiringTeamId: input.hiringTeamId,
      pipelineId,
      title: input.title,
      slug: input.slug,
      description: input.description,
      responsibilities: input.responsibilities,
      requirements: input.requirements,
      benefits: input.benefits,
      opportunityType: input.opportunityType,
      workplaceType: input.workplaceType,
      experienceLevel: input.experienceLevel,
      location: input.location,
      openings: input.openings,
      salaryMin: input.salaryMin,
      salaryMax: input.salaryMax,
      currency: input.currency,
      applicationDeadline: input.applicationDeadline,
      visibility: input.visibility,
      createdBy: membership.userId,
    });

    const skillNames = parseSkillNames(input.skills);
    if (skillNames.length > 0) {
      const skills = await findOrCreateSkillsByName(tx, skillNames);
      await replaceSkillRequirements(
        tx,
        opportunity.id,
        skills.map((skill) => ({ skillId: skill.id })),
      );
    }

    await recordAuditEvent(
      {
        organizationId: membership.organizationId,
        actorUserId: membership.userId,
        entityType: "Opportunity",
        entityId: opportunity.id,
        action: "opportunity.created",
        after: { title: opportunity.title, slug: opportunity.slug, status: opportunity.status },
      },
      tx,
    );

    return opportunity;
  });
}

export async function updateOpportunity(
  membership: ActiveMembership,
  id: string,
  input: UpdateOpportunityInput,
): Promise<Opportunity> {
  requirePermission(membership, "opportunity.update");

  const existing = await loadOpportunityOrThrow(id, membership.organizationId);
  if (existing.status === "CLOSED" || existing.status === "ARCHIVED") {
    throw new InvalidOpportunityStatusTransitionError(existing.status, existing.status);
  }

  if (input.slug !== existing.slug) {
    if (await isOpportunitySlugTaken(membership.organizationId, input.slug, id)) {
      throw new OpportunitySlugTakenError();
    }
  }
  await requireDepartmentInOrganization(input.departmentId, membership.organizationId);
  const pipelineId = await resolvePipelineId(input.pipelineId, membership.organizationId);

  return prisma.$transaction(async (tx) => {
    const before = {
      title: existing.title,
      slug: existing.slug,
      departmentId: existing.departmentId,
      pipelineId: existing.pipelineId,
      opportunityType: existing.opportunityType,
      workplaceType: existing.workplaceType,
      visibility: existing.visibility,
    };

    const updated = await updateOpportunityRecord(tx, id, {
      departmentId: input.departmentId,
      branchId: input.branchId,
      hiringTeamId: input.hiringTeamId,
      pipelineId,
      title: input.title,
      slug: input.slug,
      description: input.description,
      responsibilities: input.responsibilities,
      requirements: input.requirements,
      benefits: input.benefits,
      opportunityType: input.opportunityType,
      workplaceType: input.workplaceType,
      experienceLevel: input.experienceLevel,
      location: input.location,
      openings: input.openings,
      salaryMin: input.salaryMin,
      salaryMax: input.salaryMax,
      currency: input.currency,
      applicationDeadline: input.applicationDeadline,
      visibility: input.visibility,
      updatedBy: membership.userId,
    });

    const skillNames = parseSkillNames(input.skills);
    const skills = skillNames.length > 0 ? await findOrCreateSkillsByName(tx, skillNames) : [];
    await replaceSkillRequirements(
      tx,
      id,
      skills.map((skill) => ({ skillId: skill.id })),
    );

    await recordAuditEvent(
      {
        organizationId: membership.organizationId,
        actorUserId: membership.userId,
        entityType: "Opportunity",
        entityId: id,
        action: "opportunity.updated",
        before,
        after: {
          title: updated.title,
          slug: updated.slug,
          departmentId: updated.departmentId,
          pipelineId: updated.pipelineId,
          opportunityType: updated.opportunityType,
          workplaceType: updated.workplaceType,
          visibility: updated.visibility,
        },
      },
      tx,
    );

    return updated;
  });
}

async function transitionStatus(
  membership: ActiveMembership,
  id: string,
  allowedFrom: OpportunityStatus[],
  to: OpportunityStatus,
  auditAction: string,
  permission: PermissionKey,
  extra?: { publishAt?: Date | null; closeAt?: Date | null },
): Promise<Opportunity> {
  requirePermission(membership, permission);

  const existing = await loadOpportunityOrThrow(id, membership.organizationId);
  if (!allowedFrom.includes(existing.status)) {
    throw new InvalidOpportunityStatusTransitionError(existing.status, to);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await updateOpportunityStatus(tx, id, to, membership.userId, extra);

    await recordAuditEvent(
      {
        organizationId: membership.organizationId,
        actorUserId: membership.userId,
        entityType: "Opportunity",
        entityId: id,
        action: auditAction,
        before: { status: existing.status },
        after: { status: updated.status },
      },
      tx,
    );

    return updated;
  });
}

export function submitForReview(membership: ActiveMembership, id: string): Promise<Opportunity> {
  return transitionStatus(
    membership,
    id,
    ["DRAFT"],
    "PENDING_REVIEW",
    "opportunity.submitted_for_review",
    "opportunity.update",
  );
}

export function publishOpportunity(
  membership: ActiveMembership,
  id: string,
  publishAt?: Date,
): Promise<Opportunity> {
  const isFuturePublish = publishAt !== undefined && publishAt.getTime() > Date.now();
  return transitionStatus(
    membership,
    id,
    ["DRAFT", "PENDING_REVIEW", "SCHEDULED"],
    isFuturePublish ? "SCHEDULED" : "PUBLISHED",
    isFuturePublish ? "opportunity.scheduled" : "opportunity.published",
    "opportunity.publish",
    { publishAt: publishAt ?? null },
  );
}

export function pauseOpportunity(membership: ActiveMembership, id: string): Promise<Opportunity> {
  return transitionStatus(
    membership,
    id,
    ["PUBLISHED"],
    "PAUSED",
    "opportunity.paused",
    "opportunity.publish",
  );
}

export function resumeOpportunity(membership: ActiveMembership, id: string): Promise<Opportunity> {
  return transitionStatus(
    membership,
    id,
    ["PAUSED"],
    "PUBLISHED",
    "opportunity.resumed",
    "opportunity.publish",
  );
}

export function closeOpportunity(membership: ActiveMembership, id: string): Promise<Opportunity> {
  return transitionStatus(
    membership,
    id,
    ["PUBLISHED", "PAUSED"],
    "CLOSED",
    "opportunity.closed",
    "opportunity.archive",
    { closeAt: new Date() },
  );
}

export function archiveOpportunity(membership: ActiveMembership, id: string): Promise<Opportunity> {
  return transitionStatus(
    membership,
    id,
    ["DRAFT", "PENDING_REVIEW", "SCHEDULED", "PUBLISHED", "PAUSED", "CLOSED"],
    "ARCHIVED",
    "opportunity.archived",
    "opportunity.archive",
  );
}

export async function deleteOpportunity(membership: ActiveMembership, id: string): Promise<void> {
  requirePermission(membership, "opportunity.archive");

  const existing = await loadOpportunityOrThrow(id, membership.organizationId);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await softDeleteOpportunity(tx, id, membership.userId);
    await recordAuditEvent(
      {
        organizationId: membership.organizationId,
        actorUserId: membership.userId,
        entityType: "Opportunity",
        entityId: id,
        action: "opportunity.deleted",
        before: { status: existing.status },
      },
      tx,
    );
  });
}
