"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  requireCurrentUser,
  getActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import type { ActiveMembership } from "@/domains/platform/authorization/policy";
import { createOpportunitySchema, updateOpportunitySchema } from "./opportunity.schema";
import {
  archiveOpportunity,
  closeOpportunity,
  createOpportunity,
  deleteOpportunity,
  OpportunitySlugTakenError,
  pauseOpportunity,
  publishOpportunity,
  resumeOpportunity,
  submitForReview,
  updateOpportunity,
} from "./opportunity.service";

export type OpportunityActionState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

function readOpportunityFormData(formData: FormData) {
  return {
    title: formData.get("title"),
    slug: formData.get("slug"),
    departmentId: formData.get("departmentId"),
    branchId: formData.get("branchId"),
    pipelineId: formData.get("pipelineId"),
    hiringTeamId: formData.get("hiringTeamId"),
    opportunityType: formData.get("opportunityType"),
    workplaceType: formData.get("workplaceType"),
    experienceLevel: formData.get("experienceLevel"),
    location: formData.get("location"),
    openings: formData.get("openings"),
    salaryMin: formData.get("salaryMin"),
    salaryMax: formData.get("salaryMax"),
    currency: formData.get("currency"),
    applicationDeadline: formData.get("applicationDeadline"),
    description: formData.get("description"),
    responsibilities: formData.get("responsibilities"),
    requirements: formData.get("requirements"),
    benefits: formData.get("benefits"),
    visibility: formData.get("visibility"),
    skills: formData.get("skills"),
  };
}

export async function createOpportunityAction(
  _prevState: OpportunityActionState,
  formData: FormData,
): Promise<OpportunityActionState> {
  const user = await requireCurrentUser();
  const membership = await getActiveMembership(user.id);
  if (!membership) {
    return { error: "You must belong to an organization to create opportunities." };
  }

  const parsed = createOpportunitySchema.safeParse(readOpportunityFormData(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  let opportunityId: string;
  try {
    const opportunity = await createOpportunity(membership, parsed.data);
    opportunityId = opportunity.id;
  } catch (error) {
    if (error instanceof OpportunitySlugTakenError) {
      return { error: null, fieldErrors: { slug: error.message } };
    }
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }

  revalidatePath("/dashboard/opportunities");
  redirect(`/dashboard/opportunities/${opportunityId}`);
}

export async function updateOpportunityAction(
  _prevState: OpportunityActionState,
  formData: FormData,
): Promise<OpportunityActionState> {
  const user = await requireCurrentUser();
  const membership = await getActiveMembership(user.id);
  if (!membership) {
    return { error: "You must belong to an organization to edit opportunities." };
  }

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { error: "Missing opportunity id." };
  }

  const parsed = updateOpportunitySchema.safeParse(readOpportunityFormData(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  try {
    await updateOpportunity(membership, id, parsed.data);
  } catch (error) {
    if (error instanceof OpportunitySlugTakenError) {
      return { error: null, fieldErrors: { slug: error.message } };
    }
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }

  revalidatePath("/dashboard/opportunities");
  revalidatePath(`/dashboard/opportunities/${id}`);
  redirect(`/dashboard/opportunities/${id}`);
}

export type LifecycleActionState = { error: string | null };

async function runLifecycleAction(
  id: string,
  perform: (membership: ActiveMembership) => Promise<unknown>,
): Promise<LifecycleActionState> {
  const user = await requireCurrentUser();
  const membership = await getActiveMembership(user.id);
  if (!membership) {
    return { error: "You must belong to an organization to manage opportunities." };
  }

  try {
    await perform(membership);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }

  revalidatePath("/dashboard/opportunities");
  revalidatePath(`/dashboard/opportunities/${id}`);
  return { error: null };
}

export async function submitOpportunityForReviewAction(
  id: string,
): Promise<LifecycleActionState> {
  return runLifecycleAction(id, (membership) => submitForReview(membership, id));
}

export async function publishOpportunityAction(id: string): Promise<LifecycleActionState> {
  return runLifecycleAction(id, (membership) => publishOpportunity(membership, id));
}

export async function pauseOpportunityAction(id: string): Promise<LifecycleActionState> {
  return runLifecycleAction(id, (membership) => pauseOpportunity(membership, id));
}

export async function resumeOpportunityAction(id: string): Promise<LifecycleActionState> {
  return runLifecycleAction(id, (membership) => resumeOpportunity(membership, id));
}

export async function closeOpportunityAction(id: string): Promise<LifecycleActionState> {
  return runLifecycleAction(id, (membership) => closeOpportunity(membership, id));
}

export async function archiveOpportunityAction(id: string): Promise<LifecycleActionState> {
  return runLifecycleAction(id, (membership) => archiveOpportunity(membership, id));
}

export async function deleteOpportunityAction(id: string): Promise<LifecycleActionState> {
  const result = await runLifecycleAction(id, (membership) => deleteOpportunity(membership, id));
  if (!result.error) {
    redirect("/dashboard/opportunities");
  }
  return result;
}
