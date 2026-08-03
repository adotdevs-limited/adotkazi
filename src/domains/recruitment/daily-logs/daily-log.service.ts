import "server-only";

import type { DailyLog } from "@/generated/prisma/client";
import { recordAuditEvent } from "@/domains/platform/audit/audit.service";
import type { CurrentUser } from "@/domains/platform/tenancy/active-organization";
import { requirePermission, type ActiveMembership } from "@/domains/platform/authorization/policy";
import { findPlacementForCandidateUser } from "@/domains/recruitment/placements/placement.repository";
import {
  ensureAssignedSupervisorOrAdmin,
  PlacementNotFoundError,
} from "@/domains/recruitment/placements/placement.service";
import type { SubmitDailyLogInput } from "./daily-log.schema";
import {
  approveDailyLogRecord,
  createDailyLogRecord,
  findDailyLogByPlacementAndDate,
  findDailyLogById,
  listDailyLogsForPlacement,
  resubmitDailyLogRecord,
  returnDailyLogRecord,
} from "./daily-log.repository";

export class PlacementNotActiveError extends Error {
  constructor() {
    super("Daily logs can only be submitted while a placement is active.");
    this.name = "PlacementNotActiveError";
  }
}

export class DailyLogAlreadySubmittedError extends Error {
  constructor() {
    super("A log for this date has already been submitted.");
    this.name = "DailyLogAlreadySubmittedError";
  }
}

export class DailyLogNotFoundError extends Error {
  constructor() {
    super("That daily log could not be found.");
    this.name = "DailyLogNotFoundError";
  }
}

export class DailyLogNotActionableError extends Error {
  constructor() {
    super("This log has already been reviewed.");
    this.name = "DailyLogNotActionableError";
  }
}

export { NotAssignedSupervisorError } from "@/domains/recruitment/placements/placement.service";

export async function submitDailyLog(
  user: CurrentUser,
  placementId: string,
  input: SubmitDailyLogInput,
): Promise<DailyLog> {
  const placement = await findPlacementForCandidateUser(placementId, user.id);
  if (!placement) {
    throw new PlacementNotFoundError();
  }
  if (placement.status !== "ACTIVE") {
    throw new PlacementNotActiveError();
  }

  const data = {
    activityDescription: input.activityDescription,
    skillsLearned: input.skillsLearned,
    hoursWorked: input.hoursWorked,
    notes: input.notes,
  };

  const existing = await findDailyLogByPlacementAndDate(placementId, input.date);
  let log: DailyLog;
  if (!existing) {
    log = await createDailyLogRecord(placementId, input.date, data);
  } else if (existing.status === "RETURNED") {
    log = await resubmitDailyLogRecord(existing.id, data);
  } else {
    throw new DailyLogAlreadySubmittedError();
  }

  await recordAuditEvent({
    organizationId: placement.application.organizationId,
    actorUserId: user.id,
    entityType: "DailyLog",
    entityId: log.id,
    action: "daily_log.submitted",
    after: { date: input.date, hoursWorked: input.hoursWorked },
  });

  return log;
}

async function loadDailyLogInOrganizationOrThrow(id: string, organizationId: string) {
  const log = await findDailyLogById(id);
  if (!log || log.placement.application.organizationId !== organizationId) {
    throw new DailyLogNotFoundError();
  }
  return log;
}

export async function approveDailyLog(
  membership: ActiveMembership,
  dailyLogId: string,
): Promise<DailyLog> {
  requirePermission(membership, "daily_log.review");

  const log = await loadDailyLogInOrganizationOrThrow(dailyLogId, membership.organizationId);
  if (log.status !== "SUBMITTED") {
    throw new DailyLogNotActionableError();
  }
  ensureAssignedSupervisorOrAdmin(membership, log.placement);

  const updated = await approveDailyLogRecord(dailyLogId, membership.membershipId);

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "DailyLog",
    entityId: dailyLogId,
    action: "daily_log.approved",
  });

  return updated;
}

export async function returnDailyLog(
  membership: ActiveMembership,
  dailyLogId: string,
  comment: string,
): Promise<DailyLog> {
  requirePermission(membership, "daily_log.review");

  const log = await loadDailyLogInOrganizationOrThrow(dailyLogId, membership.organizationId);
  if (log.status !== "SUBMITTED") {
    throw new DailyLogNotActionableError();
  }
  ensureAssignedSupervisorOrAdmin(membership, log.placement);

  const updated = await returnDailyLogRecord(dailyLogId, membership.membershipId, comment);

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "DailyLog",
    entityId: dailyLogId,
    action: "daily_log.returned",
    after: { comment },
  });

  return updated;
}

export async function listDailyLogsForCandidatePlacement(user: CurrentUser, placementId: string) {
  const placement = await findPlacementForCandidateUser(placementId, user.id);
  if (!placement) {
    throw new PlacementNotFoundError();
  }
  return listDailyLogsForPlacement(placementId);
}
