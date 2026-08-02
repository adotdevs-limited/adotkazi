"use server";

import { revalidatePath } from "next/cache";

import {
  requireCurrentUser,
  getActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import { branchSchema } from "./branch.schema";
import { createBranch, deleteBranch, updateBranch } from "./branch.service";

export type BranchActionState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

function fieldErrorsFromIssues(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

function readBranchFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    code: formData.get("code"),
    address: formData.get("address"),
    city: formData.get("city"),
    country: formData.get("country"),
    isHeadquarters: formData.get("isHeadquarters"),
    status: formData.get("status"),
  };
}

export async function createBranchAction(
  _prevState: BranchActionState,
  formData: FormData,
): Promise<BranchActionState> {
  const user = await requireCurrentUser();
  const membership = await getActiveMembership(user.id);
  if (!membership) {
    return { error: "You must belong to an organization to manage branches." };
  }

  const parsed = branchSchema.safeParse(readBranchFormData(formData));
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFromIssues(parsed.error.issues) };
  }

  try {
    await createBranch(membership, parsed.data);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }

  revalidatePath("/dashboard/settings");
  return { error: null, success: true };
}

export async function updateBranchAction(
  _prevState: BranchActionState,
  formData: FormData,
): Promise<BranchActionState> {
  const user = await requireCurrentUser();
  const membership = await getActiveMembership(user.id);
  if (!membership) {
    return { error: "You must belong to an organization to manage branches." };
  }

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { error: "Missing branch id." };
  }

  const parsed = branchSchema.safeParse(readBranchFormData(formData));
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFromIssues(parsed.error.issues) };
  }

  try {
    await updateBranch(membership, id, parsed.data);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }

  revalidatePath("/dashboard/settings");
  return { error: null, success: true };
}

export type BranchLifecycleState = { error: string | null };

export async function deleteBranchAction(id: string): Promise<BranchLifecycleState> {
  const user = await requireCurrentUser();
  const membership = await getActiveMembership(user.id);
  if (!membership) {
    return { error: "You must belong to an organization to manage branches." };
  }

  try {
    await deleteBranch(membership, id);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }

  revalidatePath("/dashboard/settings");
  return { error: null };
}
