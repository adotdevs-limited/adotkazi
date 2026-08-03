import "server-only";

import type { InterviewRecommendation, InterviewStatus, InterviewType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export type CreateInterviewData = {
  applicationId: string;
  interviewType: InterviewType;
  scheduledStart: Date;
  scheduledEnd: Date;
  meetingProvider?: string;
  meetingLink?: string;
  location?: string;
  interviewerMembershipIds: string[];
};

export function createInterview(data: CreateInterviewData) {
  const { interviewerMembershipIds, ...interview } = data;
  return prisma.interview.create({
    data: {
      ...interview,
      interviewers: {
        createMany: { data: interviewerMembershipIds.map((membershipId) => ({ membershipId })) },
      },
    },
    include: interviewInclude,
  });
}

const interviewInclude = {
  interviewers: { include: { membership: { include: { user: { select: { name: true } } } } } },
  feedback: { include: { membership: { include: { user: { select: { name: true } } } } } },
};

export function listInterviewsForApplication(applicationId: string) {
  return prisma.interview.findMany({
    where: { applicationId },
    include: interviewInclude,
    orderBy: { scheduledStart: "desc" },
  });
}

export function findInterviewById(id: string) {
  return prisma.interview.findUnique({
    where: { id },
    include: {
      ...interviewInclude,
      application: { select: { id: true, organizationId: true } },
    },
  });
}

/** Candidate-facing: no `feedback`/`interviewers` — those are internal
 *  recruiter-side records (INTERVIEWS.txt's private-notes/scorecard rule). */
export function listCandidateInterviewsForApplication(applicationId: string) {
  return prisma.interview.findMany({
    where: { applicationId },
    select: {
      id: true,
      interviewType: true,
      scheduledStart: true,
      scheduledEnd: true,
      meetingProvider: true,
      meetingLink: true,
      location: true,
      status: true,
    },
    orderBy: { scheduledStart: "desc" },
  });
}

export function updateInterviewStatus(id: string, status: InterviewStatus) {
  return prisma.interview.update({ where: { id }, data: { status } });
}

export function createInterviewFeedback(data: {
  interviewId: string;
  membershipId: string;
  recommendation: InterviewRecommendation;
  comments?: string;
}) {
  return prisma.interviewFeedback.create({ data });
}
