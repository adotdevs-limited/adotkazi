import "server-only";

import { prisma } from "@/lib/db";

export type UpsertDailyLogData = {
  activityDescription: string;
  skillsLearned?: string;
  hoursWorked: number;
  notes?: string;
};

export function createDailyLogRecord(
  placementId: string,
  date: Date,
  data: UpsertDailyLogData,
) {
  return prisma.dailyLog.create({ data: { placementId, date, ...data } });
}

/** Resubmission after RETURNED — clears the previous review. */
export function resubmitDailyLogRecord(id: string, data: UpsertDailyLogData) {
  return prisma.dailyLog.update({
    where: { id },
    data: {
      ...data,
      status: "SUBMITTED",
      reviewComment: null,
      reviewedByMembershipId: null,
      reviewedAt: null,
    },
  });
}

export function findDailyLogByPlacementAndDate(placementId: string, date: Date) {
  return prisma.dailyLog.findUnique({ where: { placementId_date: { placementId, date } } });
}

export function findDailyLogById(id: string) {
  return prisma.dailyLog.findUnique({
    where: { id },
    include: {
      placement: {
        select: {
          id: true,
          supervisorMembershipId: true,
          application: { select: { organizationId: true } },
        },
      },
    },
  });
}

export function listDailyLogsForPlacement(placementId: string) {
  return prisma.dailyLog.findMany({
    where: { placementId },
    orderBy: { date: "desc" },
  });
}

export function approveDailyLogRecord(id: string, reviewedByMembershipId: string) {
  return prisma.dailyLog.update({
    where: { id },
    data: {
      status: "APPROVED",
      reviewComment: null,
      reviewedByMembershipId,
      reviewedAt: new Date(),
    },
  });
}

export function returnDailyLogRecord(id: string, reviewedByMembershipId: string, comment: string) {
  return prisma.dailyLog.update({
    where: { id },
    data: {
      status: "RETURNED",
      reviewComment: comment,
      reviewedByMembershipId,
      reviewedAt: new Date(),
    },
  });
}
