"use server";

import { revalidatePath } from "next/cache";

import {
  requireCurrentUser,
  getActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import { departmentSchema } from "./department.schema";
import { createDepartment, deleteDepartment, updateDepartment } from "./department.service";

export type DepartmentActionState = {
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

function readDepartmentFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    description: formData.get("description"),
    color: formData.get("color"),
  };
}

export async function createDepartmentAction(
  _prevState: DepartmentActionState,
  formData: FormData,
): Promise<DepartmentActionState> {
  const user = await requireCurrentUser();
  const membership = await getActiveMembership(user.id);
  if (!membership) {
    return { error: "You must belong to an organization to manage departments." };
  }

  const parsed = departmentSchema.safeParse(readDepartmentFormData(formData));
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFromIssues(parsed.error.issues) };
  }

  try {
    await createDepartment(membership, parsed.data);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }

  revalidatePath("/dashboard/settings");
  return { error: null, success: true };
}

export async function updateDepartmentAction(
  _prevState: DepartmentActionState,
  formData: FormData,
): Promise<DepartmentActionState> {
  const user = await requireCurrentUser();
  const membership = await getActiveMembership(user.id);
  if (!membership) {
    return { error: "You must belong to an organization to manage departments." };
  }

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { error: "Missing department id." };
  }

  const parsed = departmentSchema.safeParse(readDepartmentFormData(formData));
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFromIssues(parsed.error.issues) };
  }

  try {
    await updateDepartment(membership, id, parsed.data);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }

  revalidatePath("/dashboard/settings");
  return { error: null, success: true };
}

export type DepartmentLifecycleState = { error: string | null };

export async function deleteDepartmentAction(id: string): Promise<DepartmentLifecycleState> {
  const user = await requireCurrentUser();
  const membership = await getActiveMembership(user.id);
  if (!membership) {
    return { error: "You must belong to an organization to manage departments." };
  }

  try {
    await deleteDepartment(membership, id);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }

  revalidatePath("/dashboard/settings");
  return { error: null };
}
