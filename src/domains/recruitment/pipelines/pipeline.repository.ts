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
    select: { id: true, name: true, _count: { select: { stages: true } } },
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
