"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentUser } from "@/domains/platform/tenancy/active-organization";
import { saveOpportunitySchema } from "./saved-opportunity.schema";
import { saveOpportunity, unsaveOpportunity, AlreadySavedError } from "./saved-opportunity.service";

export type SavedOpportunityActionState = { error: string | null };

export async function saveOpportunityAction(
  _prevState: SavedOpportunityActionState,
  formData: FormData,
): Promise<SavedOpportunityActionState> {
  const user = await requireCurrentUser();

  const parsed = saveOpportunitySchema.safeParse({
    organizationSlug: formData.get("organizationSlug"),
    opportunitySlug: formData.get("opportunitySlug"),
  });
  if (!parsed.success) {
    return { error: "Something went wrong. Please try again." };
  }

  try {
    await saveOpportunity(user, parsed.data);
  } catch (error) {
    if (error instanceof AlreadySavedError) {
      return { error: null };
    }
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }

  revalidatePath(`/careers/${parsed.data.organizationSlug}/${parsed.data.opportunitySlug}`);
  revalidatePath("/saved-opportunities");
  return { error: null };
}

export async function unsaveOpportunityAction(
  _prevState: SavedOpportunityActionState,
  formData: FormData,
): Promise<SavedOpportunityActionState> {
  const user = await requireCurrentUser();

  const savedOpportunityId = formData.get("savedOpportunityId");
  if (typeof savedOpportunityId !== "string" || !savedOpportunityId) {
    return { error: "Something went wrong. Please try again." };
  }

  try {
    await unsaveOpportunity(user.id, savedOpportunityId);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }

  const organizationSlug = formData.get("organizationSlug");
  const opportunitySlug = formData.get("opportunitySlug");
  if (typeof organizationSlug === "string" && typeof opportunitySlug === "string") {
    revalidatePath(`/careers/${organizationSlug}/${opportunitySlug}`);
  }
  revalidatePath("/saved-opportunities");
  return { error: null };
}
