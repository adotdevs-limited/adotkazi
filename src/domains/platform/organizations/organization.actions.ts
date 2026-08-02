"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  requireCurrentUser,
  getActiveMembership,
  ACTIVE_ORG_COOKIE,
} from "@/domains/platform/tenancy/active-organization";
import { createOrganizationSchema, updateOrganizationProfileSchema } from "./organization.schema";
import { createOrganization, SlugTakenError, updateOrganizationProfile } from "./organization.service";

export type CreateOrganizationActionState = {
  error: string | null;
  fieldErrors?: Partial<Record<keyof ReturnType<typeof createOrganizationSchema.parse>, string>>;
};

export async function createOrganizationAction(
  _prevState: CreateOrganizationActionState,
  formData: FormData,
): Promise<CreateOrganizationActionState> {
  const user = await requireCurrentUser();

  const parsed = createOrganizationSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    country: formData.get("country"),
    timezone: formData.get("timezone"),
  });

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

  let organizationId: string;
  try {
    const result = await createOrganization(user.id, parsed.data);
    organizationId = result.organizationId;
  } catch (error) {
    if (error instanceof SlugTakenError) {
      return { error: null, fieldErrors: { slug: error.message } };
    }
    return { error: "Something went wrong creating your organization. Please try again." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/dashboard");
}

export type UpdateOrganizationProfileActionState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

export async function updateOrganizationProfileAction(
  _prevState: UpdateOrganizationProfileActionState,
  formData: FormData,
): Promise<UpdateOrganizationProfileActionState> {
  const user = await requireCurrentUser();
  const membership = await getActiveMembership(user.id);
  if (!membership) {
    return { error: "You must belong to an organization to edit its profile." };
  }

  const parsed = updateOrganizationProfileSchema.safeParse({
    name: formData.get("name"),
    country: formData.get("country"),
    primaryColor: formData.get("primaryColor"),
    logoUrl: formData.get("logoUrl"),
  });
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
    await updateOrganizationProfile(membership, parsed.data);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }

  revalidatePath("/dashboard/settings");
  return { error: null };
}
