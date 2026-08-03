import "server-only";

import type { PlacementStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

const placementInclude = {
  supervisorMembership: { include: { user: { select: { name: true } } } },
};

const supervisionApplicationSelect = {
  id: true,
  organizationId: true,
  candidate: { select: { user: { select: { name: true, email: true } } } },
  opportunity: { select: { id: true, title: true, opportunityType: true } },
} as const;

export type CreatePlacementData = {
  applicationId: string;
  startDate?: Date;
  endDate?: Date;
  createdBy: string;
};

export function createPlacementRecord(data: CreatePlacementData) {
  return prisma.placement.create({ data, include: placementInclude });
}

export function findPlacementByApplicationId(applicationId: string) {
  return prisma.placement.findUnique({
    where: { applicationId },
    include: placementInclude,
  });
}

export function findPlacementById(id: string) {
  return prisma.placement.findUnique({
    where: { id },
    include: {
      ...placementInclude,
      application: { select: supervisionApplicationSelect },
    },
  });
}

/** Placements assigned to a specific supervisor membership, across all of
 *  that org's opportunities — the "my students" view a Supervisor has no
 *  other way to reach, since they don't hold application.view. */
export function listPlacementsForSupervisor(supervisorMembershipId: string) {
  return prisma.placement.findMany({
    where: { supervisorMembershipId },
    include: {
      ...placementInclude,
      application: { select: supervisionApplicationSelect },
      dailyLogs: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Student-facing ownership check — mirrors
 *  application.repository.ts's findApplicationForUserAndOpportunity. */
export function findPlacementForCandidateUser(placementId: string, userId: string) {
  return prisma.placement.findFirst({
    where: { id: placementId, application: { candidate: { userId } } },
    include: {
      ...placementInclude,
      application: { select: { id: true, organizationId: true } },
    },
  });
}

export function updatePlacementStatus(id: string, status: PlacementStatus, updatedBy: string) {
  return prisma.placement.update({
    where: { id },
    data: { status, updatedBy },
    include: placementInclude,
  });
}

export function assignSupervisor(id: string, supervisorMembershipId: string, updatedBy: string) {
  return prisma.placement.update({
    where: { id },
    data: { supervisorMembershipId, updatedBy },
    include: placementInclude,
  });
}
