"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  requireCurrentUser,
  ACTIVE_ORG_COOKIE,
} from "@/domains/platform/tenancy/active-organization";
import { createOrganizationSchema } from "./organization.schema";
import { createOrganization, SlugTakenError } from "./organization.service";

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
