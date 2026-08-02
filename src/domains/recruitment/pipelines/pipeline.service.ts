import "server-only";

import type { Pipeline, PipelineStage } from "@/generated/prisma/client";
import { recordAuditEvent } from "@/domains/platform/audit/audit.service";
import { requirePermission, type ActiveMembership } from "@/domains/platform/authorization/policy";
import type { PipelineInput, PipelineStageInput } from "./pipeline.schema";
import {
  countApplicationsForStage,
  countOpportunitiesForPipeline,
  createPipelineRecord,
  createStageRecord,
  deleteStageRecord,
  findPipelineById,
  findStageById,
  isPipelineNameTaken,
  listStagesForPipeline,
  listStagesWithApplicationCounts,
  setDefaultPipelineRecord,
  softDeletePipelineRecord,
  swapStageOrder,
  updatePipelineRecord,
  updateStageRecord,
} from "./pipeline.repository";

export class PipelineNotFoundError extends Error {
  constructor() {
    super("That pipeline could not be found.");
    this.name = "PipelineNotFoundError";
  }
}

export class PipelineNameTakenError extends Error {
  constructor() {
    super("A pipeline with that name already exists in this organization.");
    this.name = "PipelineNameTakenError";
  }
}

export class PipelineStageNotFoundError extends Error {
  constructor() {
    super("That stage could not be found.");
    this.name = "PipelineStageNotFoundError";
  }
}

export class CannotDeleteSystemPipelineError extends Error {
  constructor() {
    super("The default seeded pipeline can't be deleted.");
    this.name = "CannotDeleteSystemPipelineError";
  }
}

export class CannotDeleteDefaultPipelineError extends Error {
  constructor() {
    super("Set a different pipeline as default before deleting this one.");
    this.name = "CannotDeleteDefaultPipelineError";
  }
}

export class PipelineInUseError extends Error {
  constructor() {
    super("This pipeline is used by one or more opportunities and can't be deleted.");
    this.name = "PipelineInUseError";
  }
}

export class StageInUseError extends Error {
  constructor() {
    super("One or more applications are currently in this stage — move them first.");
    this.name = "StageInUseError";
  }
}

async function loadPipelineOrThrow(id: string, organizationId: string): Promise<Pipeline> {
  const pipeline = await findPipelineById(id, organizationId);
  if (!pipeline) {
    throw new PipelineNotFoundError();
  }
  return pipeline;
}

async function loadStageOrThrow(id: string, pipelineId: string): Promise<PipelineStage> {
  const stage = await findStageById(id, pipelineId);
  if (!stage) {
    throw new PipelineStageNotFoundError();
  }
  return stage;
}

export async function getPipelineDetail(membership: ActiveMembership, id: string) {
  requirePermission(membership, "pipeline.manage");

  const pipeline = await loadPipelineOrThrow(id, membership.organizationId);
  const [stages, opportunityCount] = await Promise.all([
    listStagesWithApplicationCounts(id),
    countOpportunitiesForPipeline(id),
  ]);

  return { pipeline, stages, opportunityCount };
}

export async function createPipeline(
  membership: ActiveMembership,
  input: PipelineInput,
): Promise<Pipeline> {
  requirePermission(membership, "pipeline.manage");

  if (await isPipelineNameTaken(membership.organizationId, input.name)) {
    throw new PipelineNameTakenError();
  }

  const pipeline = await createPipelineRecord(membership.organizationId, input);

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "Pipeline",
    entityId: pipeline.id,
    action: "pipeline.created",
    after: { name: pipeline.name },
  });

  return pipeline;
}

export async function updatePipeline(
  membership: ActiveMembership,
  id: string,
  input: PipelineInput,
): Promise<Pipeline> {
  requirePermission(membership, "pipeline.manage");

  const existing = await loadPipelineOrThrow(id, membership.organizationId);
  if (input.name !== existing.name && (await isPipelineNameTaken(membership.organizationId, input.name, id))) {
    throw new PipelineNameTakenError();
  }

  const updated = await updatePipelineRecord(id, input);

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "Pipeline",
    entityId: id,
    action: "pipeline.updated",
    before: { name: existing.name, description: existing.description },
    after: { name: updated.name, description: updated.description },
  });

  return updated;
}

export async function deletePipeline(membership: ActiveMembership, id: string): Promise<void> {
  requirePermission(membership, "pipeline.manage");

  const existing = await loadPipelineOrThrow(id, membership.organizationId);
  if (existing.isSystem) {
    throw new CannotDeleteSystemPipelineError();
  }
  if (existing.isDefault) {
    throw new CannotDeleteDefaultPipelineError();
  }
  if ((await countOpportunitiesForPipeline(id)) > 0) {
    throw new PipelineInUseError();
  }

  await softDeletePipelineRecord(id);

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "Pipeline",
    entityId: id,
    action: "pipeline.deleted",
    before: { name: existing.name },
  });
}

export async function setDefaultPipeline(membership: ActiveMembership, id: string): Promise<void> {
  requirePermission(membership, "pipeline.manage");

  const existing = await loadPipelineOrThrow(id, membership.organizationId);
  if (existing.isDefault) {
    return;
  }

  await setDefaultPipelineRecord(membership.organizationId, id);

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "Pipeline",
    entityId: id,
    action: "pipeline.default_changed",
    after: { name: existing.name },
  });
}

export async function createPipelineStage(
  membership: ActiveMembership,
  pipelineId: string,
  input: PipelineStageInput,
): Promise<PipelineStage> {
  requirePermission(membership, "pipeline.manage");

  await loadPipelineOrThrow(pipelineId, membership.organizationId);
  const stage = await createStageRecord(pipelineId, input);

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "PipelineStage",
    entityId: stage.id,
    action: "pipeline_stage.created",
    after: { pipelineId, name: stage.name },
  });

  return stage;
}

export async function updatePipelineStage(
  membership: ActiveMembership,
  pipelineId: string,
  stageId: string,
  input: PipelineStageInput,
): Promise<PipelineStage> {
  requirePermission(membership, "pipeline.manage");

  await loadPipelineOrThrow(pipelineId, membership.organizationId);
  const existing = await loadStageOrThrow(stageId, pipelineId);
  const updated = await updateStageRecord(stageId, input);

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "PipelineStage",
    entityId: stageId,
    action: "pipeline_stage.updated",
    before: { name: existing.name },
    after: { name: updated.name },
  });

  return updated;
}

export async function deletePipelineStage(
  membership: ActiveMembership,
  pipelineId: string,
  stageId: string,
): Promise<void> {
  requirePermission(membership, "pipeline.manage");

  await loadPipelineOrThrow(pipelineId, membership.organizationId);
  const existing = await loadStageOrThrow(stageId, pipelineId);
  if ((await countApplicationsForStage(stageId)) > 0) {
    throw new StageInUseError();
  }

  await deleteStageRecord(stageId);

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "PipelineStage",
    entityId: stageId,
    action: "pipeline_stage.deleted",
    before: { name: existing.name },
  });
}

export async function movePipelineStage(
  membership: ActiveMembership,
  pipelineId: string,
  stageId: string,
  direction: "up" | "down",
): Promise<void> {
  requirePermission(membership, "pipeline.manage");

  await loadPipelineOrThrow(pipelineId, membership.organizationId);
  const stages = await listStagesForPipeline(pipelineId);
  const index = stages.findIndex((stage) => stage.id === stageId);
  if (index === -1) {
    throw new PipelineStageNotFoundError();
  }

  const neighborIndex = direction === "up" ? index - 1 : index + 1;
  if (neighborIndex < 0 || neighborIndex >= stages.length) {
    return;
  }

  const stage = stages[index]!;
  const neighbor = stages[neighborIndex]!;

  await swapStageOrder(stage, neighbor);

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "PipelineStage",
    entityId: stageId,
    action: "pipeline_stage.reordered",
    before: { order: stage.order },
    after: { order: neighbor.order },
  });
}
