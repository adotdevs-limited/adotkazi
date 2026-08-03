import "server-only";

import { prisma } from "@/lib/db";

export function createSavedOpportunity(candidateId: string, opportunityId: string) {
  return prisma.savedOpportunity.create({ data: { candidateId, opportunityId } });
}

export function findSavedOpportunity(candidateId: string, opportunityId: string) {
  return prisma.savedOpportunity.findUnique({
    where: { candidateId_opportunityId: { candidateId, opportunityId } },
  });
}

/** Read-only, candidate-facing: mirrors findApplicationForUserAndOpportunity's
 *  "viewing isn't a candidate action" rule — never creates a Candidate row. */
export function findSavedOpportunityForUser(userId: string, opportunityId: string) {
  return prisma.savedOpportunity.findFirst({
    where: { opportunityId, candidate: { userId } },
  });
}

export function deleteSavedOpportunity(id: string) {
  return prisma.savedOpportunity.delete({ where: { id } });
}

/** Ownership check for the unsave action — a candidate may only remove their own bookmark. */
export function findSavedOpportunityByIdForUser(id: string, userId: string) {
  return prisma.savedOpportunity.findFirst({ where: { id, candidate: { userId } } });
}

export function listSavedOpportunitiesForCandidate(userId: string) {
  return prisma.savedOpportunity.findMany({
    where: { candidate: { userId } },
    include: {
      opportunity: {
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          opportunityType: true,
          organization: { select: { slug: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
