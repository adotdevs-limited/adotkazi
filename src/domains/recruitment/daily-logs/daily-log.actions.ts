"use server";

import { revalidatePath } from "next/cache";

import {
  requireCurrentUser,
  getActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import type { ActiveMembership } from "@/domains/platform/authorization/policy";
import { submitDailyLogSchema, returnDailyLogSchema } from "./daily-log.schema";
import { approveDailyLog, returnDailyLog, submitDailyLog } from "./daily-log.service";

export type DailyLogActionState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

export async function submitDailyLogAction(
  applicationId: string,
  placementId: string,
  _prevState: DailyLogActionState,
  formData: FormData,
): Promise<DailyLogActionState> {
  const user = await requireCurrentUser();

  const parsed = submitDailyLogSchema.safeParse({
    date: formData.get("date"),
    activityDescription: formData.get("activityDescription"),
    skillsLearned: formData.get("skillsLearned"),
    hoursWorked: formData.get("hoursWorked"),
    notes: formData.get("notes"),
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

  try {
    await submitDailyLog(user, placementId, parsed.data);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }

  revalidatePath(`/applications/${applicationId}/daily-logs`);
  return { error: null };
}

async function runReviewAction(
  perform: (membership: ActiveMembership) => Promise<unknown>,
  opportunityId: string,
  applicationId: string,
): Promise<DailyLogActionState> {
  const user = await requireCurrentUser();
  const membership = await getActiveMembership(user.id);
  if (!membership) {
    return { error: "You must belong to an organization to review daily logs." };
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

export async function approveDailyLogAction(
  opportunityId: string,
  applicationId: string,
  dailyLogId: string,
): Promise<DailyLogActionState> {
  return runReviewAction(
    (membership) => approveDailyLog(membership, dailyLogId),
    opportunityId,
    applicationId,
  );
}

export async function returnDailyLogAction(
  opportunityId: string,
  applicationId: string,
  dailyLogId: string,
  _prevState: DailyLogActionState,
  formData: FormData,
): Promise<DailyLogActionState> {
  const parsed = returnDailyLogSchema.safeParse({ comment: formData.get("comment") });
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

  return runReviewAction(
    (membership) => returnDailyLog(membership, dailyLogId, parsed.data.comment),
    opportunityId,
    applicationId,
  );
}
