import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

const DEFAULT_PIPELINE_NAME = "Recruitment Pipeline";

/** RECRUITMENT.txt's example pipeline — last stage is terminal (hired). */
const DEFAULT_STAGES = [
  "Applied",
  "Screening",
  "Shortlisted",
  "HR Interview",
  "Technical Interview",
  "Assessment",
  "Final Interview",
  "Offer",
  "Hired",
];

export function listPipelinesForOrganization(organizationId: string) {
  return prisma.pipeline.findMany({
    where: { organizationId, deletedAt: null },
    select: {
      id: true,
      name: true,
      isDefault: true,
      isSystem: true,
      _count: { select: { stages: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export function findDefaultPipeline(organizationId: string) {
  return prisma.pipeline.findFirst({
    where: { organizationId, isDefault: true, deletedAt: null },
  });
}

export function findPipelineById(id: string, organizationId: string) {
  return prisma.pipeline.findFirst({ where: { id, organizationId, deletedAt: null } });
}

export function listStagesForPipeline(pipelineId: string) {
  return prisma.pipelineStage.findMany({ where: { pipelineId }, orderBy: { order: "asc" } });
}

export function listStagesWithApplicationCounts(pipelineId: string) {
  return prisma.pipelineStage.findMany({
    where: { pipelineId },
    orderBy: { order: "asc" },
    include: { _count: { select: { applications: true } } },
  });
}

export function isPipelineNameTaken(organizationId: string, name: string, excludeId?: string) {
  return prisma.pipeline
    .findFirst({
      where: { organizationId, name, deletedAt: null, id: excludeId ? { not: excludeId } : undefined },
      select: { id: true },
    })
    .then(Boolean);
}

export function countOpportunitiesForPipeline(pipelineId: string) {
  return prisma.opportunity.count({ where: { pipelineId } });
}

export function countApplicationsForStage(stageId: string) {
  return prisma.application.count({ where: { currentStageId: stageId } });
}

export function createPipelineRecord(
  organizationId: string,
  data: { name: string; description?: string },
) {
  return prisma.pipeline.create({
    data: { organizationId, name: data.name, description: data.description },
  });
}

export function updatePipelineRecord(id: string, data: { name: string; description?: string }) {
  return prisma.pipeline.update({
    where: { id },
    data: { name: data.name, description: data.description ?? null },
  });
}

export function softDeletePipelineRecord(id: string) {
  return prisma.pipeline.update({ where: { id }, data: { deletedAt: new Date() } });
}

export function setDefaultPipelineRecord(organizationId: string, id: string) {
  return prisma.$transaction([
    prisma.pipeline.updateMany({
      where: { organizationId, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.pipeline.update({ where: { id }, data: { isDefault: true } }),
  ]);
}

export function findStageById(id: string, pipelineId: string) {
  return prisma.pipelineStage.findFirst({ where: { id, pipelineId } });
}

export async function createStageRecord(
  pipelineId: string,
  data: { name: string; color?: string; isTerminal: boolean; allowsFeedback: boolean },
) {
  const last = await prisma.pipelineStage.findFirst({
    where: { pipelineId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  return prisma.pipelineStage.create({
    data: {
      pipelineId,
      name: data.name,
      color: data.color,
      isTerminal: data.isTerminal,
      allowsFeedback: data.allowsFeedback,
      order: (last?.order ?? -1) + 1,
    },
  });
}

export function updateStageRecord(
  id: string,
  data: { name: string; color?: string; isTerminal: boolean; allowsFeedback: boolean },
) {
  return prisma.pipelineStage.update({
    where: { id },
    data: {
      name: data.name,
      color: data.color ?? null,
      isTerminal: data.isTerminal,
      allowsFeedback: data.allowsFeedback,
    },
  });
}

export function deleteStageRecord(id: string) {
  return prisma.pipelineStage.delete({ where: { id } });
}

/** Swaps `order` between two stages via a scratch value — see PipelineStage's `[pipelineId, order]` unique constraint. */
export function swapStageOrder(stageA: { id: string; order: number }, stageB: { id: string; order: number }) {
  return prisma.$transaction([
    prisma.pipelineStage.update({ where: { id: stageA.id }, data: { order: -1 } }),
    prisma.pipelineStage.update({ where: { id: stageB.id }, data: { order: stageA.order } }),
    prisma.pipelineStage.update({ where: { id: stageA.id }, data: { order: stageB.order } }),
  ]);
}

/**
 * Creates the organization's default recruitment pipeline and its ordered
 * stages. Called once from createOrganization's transaction — see that
 * function for why this is a direct call rather than a domain event.
 */
export async function createDefaultPipeline(tx: Prisma.TransactionClient, organizationId: string) {
  const pipeline = await tx.pipeline.create({
    data: {
      organizationId,
      name: DEFAULT_PIPELINE_NAME,
      isSystem: true,
      isDefault: true,
    },
  });

  await tx.pipelineStage.createMany({
    data: DEFAULT_STAGES.map((name, index) => ({
      pipelineId: pipeline.id,
      name,
      order: index,
      isTerminal: index === DEFAULT_STAGES.length - 1,
    })),
  });

  return pipeline;
}
