"use server";

import { revalidatePath } from "next/cache";

import {
  requireCurrentUser,
  getActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import type { ActiveMembership } from "@/domains/platform/authorization/policy";
import { scheduleInterviewSchema, submitFeedbackSchema } from "./interview.schema";
import {
  scheduleInterview,
  cancelInterview,
  completeInterview,
  submitInterviewFeedback,
} from "./interview.service";

export type InterviewActionState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

async function runInterviewLifecycleAction(
  perform: (membership: ActiveMembership) => Promise<unknown>,
  opportunityId: string,
  applicationId: string,
): Promise<InterviewActionState> {
  const user = await requireCurrentUser();
  const membership = await getActiveMembership(user.id);
  if (!membership) {
    return { error: "You must belong to an organization to manage interviews." };
  }

  try {
    await perform(membership);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }

  revalidatePath(`/dashboard/opportunities/${opportunityId}/applications/${applicationId}`);
  return { error: null };
}

export async function scheduleInterviewAction(
  opportunityId: string,
  applicationId: string,
  _prevState: InterviewActionState,
  formData: FormData,
): Promise<InterviewActionState> {
  const parsed = scheduleInterviewSchema.safeParse({
    interviewType: formData.get("interviewType"),
    scheduledStart: formData.get("scheduledStart"),
    scheduledEnd: formData.get("scheduledEnd"),
    meetingProvider: formData.get("meetingProvider"),
    meetingLink: formData.get("meetingLink"),
    location: formData.get("location"),
    interviewerMembershipIds: formData.getAll("interviewerMembershipIds"),
  });
  if (!parsed.success) {
    return {
      error: null,
      fieldErrors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([key, messages]) => [
          key,
          messages?.[0] ?? "Invalid value.",
        ]),
      ),
    };
  }

  return runInterviewLifecycleAction(
    (membership) => scheduleInterview(membership, applicationId, parsed.data),
    opportunityId,
    applicationId,
  );
}

export async function cancelInterviewAction(
  opportunityId: string,
  applicationId: string,
  interviewId: string,
): Promise<InterviewActionState> {
  return runInterviewLifecycleAction(
    (membership) => cancelInterview(membership, interviewId),
    opportunityId,
    applicationId,
  );
}

export async function completeInterviewAction(
  opportunityId: string,
  applicationId: string,
  interviewId: string,
): Promise<InterviewActionState> {
  return runInterviewLifecycleAction(
    (membership) => completeInterview(membership, interviewId),
    opportunityId,
    applicationId,
  );
}

export async function submitFeedbackAction(
  opportunityId: string,
  applicationId: string,
  interviewId: string,
  _prevState: InterviewActionState,
  formData: FormData,
): Promise<InterviewActionState> {
  const parsed = submitFeedbackSchema.safeParse({
    recommendation: formData.get("recommendation"),
    comments: formData.get("comments"),
  });
  if (!parsed.success) {
    return {
      error: null,
      fieldErrors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([key, messages]) => [
          key,
          messages?.[0] ?? "Invalid value.",
        ]),
      ),
    };
  }

  return runInterviewLifecycleAction(
    (membership) => submitInterviewFeedback(membership, interviewId, parsed.data),
    opportunityId,
    applicationId,
  );
}
