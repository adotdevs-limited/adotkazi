"use server";

import { revalidatePath } from "next/cache";

import {
  requireCurrentUser,
  getActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import type { ActiveMembership } from "@/domains/platform/authorization/policy";
import {
  submitApplicationSchema,
  validateResumeFile,
  validateAcademicTranscriptFile,
  validateRecommendationLetterFile,
  InvalidResumeFileError,
} from "./application.schema";
import {
  submitApplication,
  moveApplicationStage,
  rejectApplication,
  reactivateApplication,
  AlreadyAppliedError,
  MissingApplicationFieldsError,
  OpportunityNotAcceptingApplicationsError,
} from "./application.service";

export type ApplicationActionState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

export async function submitApplicationAction(
  _prevState: ApplicationActionState,
  formData: FormData,
): Promise<ApplicationActionState> {
  const user = await requireCurrentUser();

  const parsed = submitApplicationSchema.safeParse({
    organizationSlug: formData.get("organizationSlug"),
    opportunitySlug: formData.get("opportunitySlug"),
    coverNote: formData.get("coverNote"),
    institution: formData.get("institution"),
    program: formData.get("program"),
    levelOfStudy: formData.get("levelOfStudy"),
    yearOfStudy: formData.get("yearOfStudy"),
  });
  if (!parsed.success) {
    return { error: "Something went wrong. Please try again." };
  }

  let resumeFile: File;
  let academicTranscriptFile: File | undefined;
  let recommendationLetterFile: File | undefined;
  try {
    resumeFile = validateResumeFile(formData.get("resume"));
    academicTranscriptFile = validateAcademicTranscriptFile(formData.get("academicTranscript"));
    recommendationLetterFile = validateRecommendationLetterFile(
      formData.get("recommendationLetter"),
    );
  } catch (error) {
    if (error instanceof InvalidResumeFileError) {
      return { error: null, fieldErrors: { resume: error.message } };
    }
    throw error;
  }

  try {
    await submitApplication(user, {
      ...parsed.data,
      resumeFile,
      academicTranscriptFile,
      recommendationLetterFile,
    });
  } catch (error) {
    if (
      error instanceof AlreadyAppliedError ||
      error instanceof OpportunityNotAcceptingApplicationsError ||
      error instanceof MissingApplicationFieldsError
    ) {
      return { error: error.message };
    }
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }

  revalidatePath(`/careers/${parsed.data.organizationSlug}/${parsed.data.opportunitySlug}`);
  return { error: null, success: true };
}

export type ApplicationLifecycleState = { error: string | null };

async function runApplicationLifecycleAction(
  applicationId: string,
  perform: (membership: ActiveMembership) => Promise<{ opportunityId: string }>,
): Promise<ApplicationLifecycleState> {
  const user = await requireCurrentUser();
  const membership = await getActiveMembership(user.id);
  if (!membership) {
    return { error: "You must belong to an organization to review applications." };
  }

  let opportunityId: string;
  try {
    const result = await perform(membership);
    opportunityId = result.opportunityId;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }

  revalidatePath(`/dashboard/opportunities/${opportunityId}/applications`);
  revalidatePath(`/dashboard/opportunities/${opportunityId}/applications/${applicationId}`);
  return { error: null };
}

export async function moveApplicationStageAction(
  applicationId: string,
  stageId: string,
): Promise<ApplicationLifecycleState> {
  return runApplicationLifecycleAction(applicationId, (membership) =>
    moveApplicationStage(membership, applicationId, stageId),
  );
}

export async function rejectApplicationAction(
  applicationId: string,
): Promise<ApplicationLifecycleState> {
  return runApplicationLifecycleAction(applicationId, (membership) =>
    rejectApplication(membership, applicationId),
  );
}

export async function reactivateApplicationAction(
  applicationId: string,
): Promise<ApplicationLifecycleState> {
  return runApplicationLifecycleAction(applicationId, (membership) =>
    reactivateApplication(membership, applicationId),
  );
}
