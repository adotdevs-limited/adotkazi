import "server-only";

import type { ApplicationStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export async function findOrCreateCandidateForUser(userId: string) {
  const existing = await prisma.candidate.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.candidate.create({ data: { userId } });
}

export function findApplicationForCandidate(candidateId: string, opportunityId: string) {
  return prisma.application.findUnique({
    where: { candidateId_opportunityId: { candidateId, opportunityId } },
  });
}

/** Read-only lookup for rendering — unlike findOrCreateCandidateForUser, never
 *  creates a Candidate row just because a signed-in user viewed the page. */
export function findApplicationForUserAndOpportunity(userId: string, opportunityId: string) {
  return prisma.application.findFirst({
    where: { opportunityId, candidate: { userId } },
  });
}

export type CreateApplicationData = {
  organizationId: string;
  opportunityId: string;
  candidateId: string;
  currentStageId?: string;
  coverNote?: string;
  resumeFilename: string;
  resumeStoragePath: string;
};

export function createApplication(data: CreateApplicationData) {
  return prisma.application.create({ data });
}

export function listApplicationsForOpportunity(opportunityId: string) {
  return prisma.application.findMany({
    where: { opportunityId },
    include: {
      candidate: { include: { user: { select: { name: true, email: true } } } },
      currentStage: true,
    },
    orderBy: { appliedAt: "desc" },
  });
}

export function countApplicationsForOpportunity(opportunityId: string) {
  return prisma.application.count({ where: { opportunityId } });
}

export function findApplicationById(id: string) {
  return prisma.application.findUnique({
    where: { id },
    include: {
      candidate: { include: { user: { select: { name: true, email: true } } } },
      currentStage: true,
      opportunity: { select: { id: true, title: true, organizationId: true, pipelineId: true } },
    },
  });
}

export function updateApplicationStage(id: string, currentStageId: string) {
  return prisma.application.update({ where: { id }, data: { currentStageId } });
}

export function updateApplicationStatus(id: string, status: ApplicationStatus) {
  return prisma.application.update({ where: { id }, data: { status } });
}
