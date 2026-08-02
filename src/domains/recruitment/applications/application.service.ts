import "server-only";
import { randomUUID } from "node:crypto";

import type { Application } from "@/generated/prisma/client";
import { recordAuditEvent } from "@/domains/platform/audit/audit.service";
import type { CurrentUser } from "@/domains/platform/tenancy/active-organization";
import { requirePermission, type ActiveMembership } from "@/domains/platform/authorization/policy";
import { findOrganizationBySlug } from "@/domains/platform/organizations/organization.repository";
import {
  findOpportunityById,
  findPublicOpportunityBySlug,
} from "@/domains/recruitment/opportunities/opportunity.repository";
import { listStagesForPipeline } from "@/domains/recruitment/pipelines/pipeline.repository";
import { storageProvider } from "@/lib/storage";
import {
  createApplication,
  findApplicationById,
  findApplicationForCandidate,
  findOrCreateCandidateForUser,
  listApplicationsForOpportunity as listApplicationsForOpportunityRecord,
  updateApplicationStage,
  updateApplicationStatus,
} from "./application.repository";

export class OpportunityNotAcceptingApplicationsError extends Error {
  constructor() {
    super("This opportunity isn't accepting applications right now.");
    this.name = "OpportunityNotAcceptingApplicationsError";
  }
}

export class AlreadyAppliedError extends Error {
  constructor() {
    super("You've already applied to this opportunity.");
    this.name = "AlreadyAppliedError";
  }
}

export class ApplicationNotFoundError extends Error {
  constructor() {
    super("That application could not be found.");
    this.name = "ApplicationNotFoundError";
  }
}

export class InvalidPipelineStageError extends Error {
  constructor() {
    super("That stage does not belong to this opportunity's pipeline.");
    this.name = "InvalidPipelineStageError";
  }
}

/** Strips path separators and anything outside a conservative safe set. */
function sanitizeFilename(filename: string): string {
  const base = filename.replace(/[/\\]/g, "_").replace(/[^a-zA-Z0-9._-]/g, "_");
  return base.slice(-140) || "resume";
}

export async function submitApplication(
  user: CurrentUser,
  input: {
    organizationSlug: string;
    opportunitySlug: string;
    coverNote?: string;
    resumeFile: File;
  },
): Promise<Application> {
  const organization = await findOrganizationBySlug(input.organizationSlug);
  if (!organization || (organization.status !== "ACTIVE" && organization.status !== "TRIAL")) {
    throw new OpportunityNotAcceptingApplicationsError();
  }

  const opportunity = await findPublicOpportunityBySlug(organization.id, input.opportunitySlug);
  if (!opportunity) {
    throw new OpportunityNotAcceptingApplicationsError();
  }
  if (opportunity.applicationDeadline && opportunity.applicationDeadline < new Date()) {
    throw new OpportunityNotAcceptingApplicationsError();
  }

  const candidate = await findOrCreateCandidateForUser(user.id);

  const existingApplication = await findApplicationForCandidate(candidate.id, opportunity.id);
  if (existingApplication) {
    throw new AlreadyAppliedError();
  }

  const data = Buffer.from(await input.resumeFile.arrayBuffer());
  const filename = `${randomUUID()}-${sanitizeFilename(input.resumeFile.name)}`;
  const { path } = await storageProvider.upload({
    organizationId: organization.id,
    filename,
    data,
    contentType: input.resumeFile.type || "application/octet-stream",
  });

  const stages = await listStagesForPipeline(opportunity.pipelineId);

  const application = await createApplication({
    organizationId: organization.id,
    opportunityId: opportunity.id,
    candidateId: candidate.id,
    currentStageId: stages[0]?.id,
    coverNote: input.coverNote,
    resumeFilename: input.resumeFile.name,
    resumeStoragePath: path,
  });

  await recordAuditEvent({
    organizationId: organization.id,
    actorUserId: user.id,
    entityType: "Application",
    entityId: application.id,
    action: "application.submitted",
    after: { opportunityId: opportunity.id, candidateId: candidate.id },
  });

  return application;
}

export async function listApplicationsForOpportunity(
  membership: ActiveMembership,
  opportunityId: string,
) {
  requirePermission(membership, "application.view");

  const opportunity = await findOpportunityById(opportunityId, membership.organizationId);
  if (!opportunity) {
    throw new ApplicationNotFoundError();
  }

  return listApplicationsForOpportunityRecord(opportunityId);
}

async function loadApplicationInOrganizationOrThrow(applicationId: string, organizationId: string) {
  const application = await findApplicationById(applicationId);
  if (!application || application.opportunity.organizationId !== organizationId) {
    throw new ApplicationNotFoundError();
  }
  return application;
}

export async function getApplicationDetail(membership: ActiveMembership, applicationId: string) {
  requirePermission(membership, "application.view");
  return loadApplicationInOrganizationOrThrow(applicationId, membership.organizationId);
}

export async function moveApplicationStage(
  membership: ActiveMembership,
  applicationId: string,
  stageId: string,
) {
  requirePermission(membership, "application.update");

  const application = await loadApplicationInOrganizationOrThrow(
    applicationId,
    membership.organizationId,
  );

  const stages = await listStagesForPipeline(application.opportunity.pipelineId);
  if (!stages.some((stage) => stage.id === stageId)) {
    throw new InvalidPipelineStageError();
  }

  const updated = await updateApplicationStage(applicationId, stageId);

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "Application",
    entityId: applicationId,
    action: "application.stage_changed",
    before: { currentStageId: application.currentStageId },
    after: { currentStageId: stageId },
  });

  return updated;
}

async function setApplicationStatus(
  membership: ActiveMembership,
  applicationId: string,
  status: "ACTIVE" | "REJECTED",
  auditAction: string,
) {
  requirePermission(membership, "application.update");

  const application = await loadApplicationInOrganizationOrThrow(
    applicationId,
    membership.organizationId,
  );

  const updated = await updateApplicationStatus(applicationId, status);

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "Application",
    entityId: applicationId,
    action: auditAction,
    before: { status: application.status },
    after: { status },
  });

  return updated;
}

export function rejectApplication(membership: ActiveMembership, applicationId: string) {
  return setApplicationStatus(membership, applicationId, "REJECTED", "application.rejected");
}

export function reactivateApplication(membership: ActiveMembership, applicationId: string) {
  return setApplicationStatus(membership, applicationId, "ACTIVE", "application.reactivated");
}
