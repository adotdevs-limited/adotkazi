import "server-only";

import type { Interview, InterviewFeedback } from "@/generated/prisma/client";
import { recordAuditEvent } from "@/domains/platform/audit/audit.service";
import { requirePermission, type ActiveMembership } from "@/domains/platform/authorization/policy";
import { findApplicationById } from "@/domains/recruitment/applications/application.repository";
import { ApplicationNotFoundError } from "@/domains/recruitment/applications/application.service";
import { listMembers } from "@/domains/platform/memberships/membership.repository";
import type { ScheduleInterviewInput, SubmitFeedbackInput } from "./interview.schema";
import {
  createInterview,
  createInterviewFeedback,
  findInterviewById,
  updateInterviewStatus,
} from "./interview.repository";

export class InterviewNotFoundError extends Error {
  constructor() {
    super("That interview could not be found.");
    this.name = "InterviewNotFoundError";
  }
}

export class InterviewNotActionableError extends Error {
  constructor() {
    super("This interview has already been resolved.");
    this.name = "InterviewNotActionableError";
  }
}

export class InvalidInterviewerError extends Error {
  constructor() {
    super("One or more selected interviewers don't belong to this organization.");
    this.name = "InvalidInterviewerError";
  }
}

export class NotAnInterviewerError extends Error {
  constructor() {
    super("You're not assigned to this interview.");
    this.name = "NotAnInterviewerError";
  }
}

export class FeedbackAlreadySubmittedError extends Error {
  constructor() {
    super("You've already submitted feedback for this interview.");
    this.name = "FeedbackAlreadySubmittedError";
  }
}

async function loadApplicationInOrganizationOrThrow(applicationId: string, organizationId: string) {
  const application = await findApplicationById(applicationId);
  if (!application || application.opportunity.organizationId !== organizationId) {
    throw new ApplicationNotFoundError();
  }
  return application;
}

async function loadInterviewInOrganizationOrThrow(interviewId: string, organizationId: string) {
  const interview = await findInterviewById(interviewId);
  if (!interview || interview.application.organizationId !== organizationId) {
    throw new InterviewNotFoundError();
  }
  return interview;
}

export async function scheduleInterview(
  membership: ActiveMembership,
  applicationId: string,
  input: ScheduleInterviewInput,
): Promise<Interview> {
  requirePermission(membership, "interview.manage");

  await loadApplicationInOrganizationOrThrow(applicationId, membership.organizationId);

  const members = await listMembers(membership.organizationId);
  const validMembershipIds = new Set(
    members.filter((member) => member.status === "ACTIVE").map((member) => member.id),
  );
  if (!input.interviewerMembershipIds.every((id) => validMembershipIds.has(id))) {
    throw new InvalidInterviewerError();
  }

  const interview = await createInterview({ applicationId, ...input });

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "Interview",
    entityId: interview.id,
    action: "interview.scheduled",
    after: { interviewType: input.interviewType, scheduledStart: input.scheduledStart },
  });

  return interview;
}

async function setInterviewStatus(
  membership: ActiveMembership,
  interviewId: string,
  status: "COMPLETED" | "CANCELLED",
  auditAction: string,
): Promise<Interview> {
  requirePermission(membership, "interview.manage");

  const interview = await loadInterviewInOrganizationOrThrow(interviewId, membership.organizationId);
  if (interview.status !== "SCHEDULED") {
    throw new InterviewNotActionableError();
  }

  const updated = await updateInterviewStatus(interviewId, status);

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "Interview",
    entityId: interviewId,
    action: auditAction,
  });

  return updated;
}

export function cancelInterview(membership: ActiveMembership, interviewId: string) {
  return setInterviewStatus(membership, interviewId, "CANCELLED", "interview.cancelled");
}

export function completeInterview(membership: ActiveMembership, interviewId: string) {
  return setInterviewStatus(membership, interviewId, "COMPLETED", "interview.completed");
}

export async function submitInterviewFeedback(
  membership: ActiveMembership,
  interviewId: string,
  input: SubmitFeedbackInput,
): Promise<InterviewFeedback> {
  requirePermission(membership, "interview.feedback");

  const interview = await loadInterviewInOrganizationOrThrow(interviewId, membership.organizationId);

  const isAssigned = interview.interviewers.some(
    (participant) => participant.membershipId === membership.membershipId,
  );
  if (!isAssigned) {
    throw new NotAnInterviewerError();
  }

  const alreadySubmitted = interview.feedback.some(
    (feedback) => feedback.membershipId === membership.membershipId,
  );
  if (alreadySubmitted) {
    throw new FeedbackAlreadySubmittedError();
  }

  const feedback = await createInterviewFeedback({
    interviewId,
    membershipId: membership.membershipId,
    ...input,
  });

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "InterviewFeedback",
    entityId: feedback.id,
    action: "interview_feedback.submitted",
    after: { recommendation: input.recommendation },
  });

  return feedback;
}
