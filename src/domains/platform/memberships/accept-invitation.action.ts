"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  requireCurrentUser,
  ACTIVE_ORG_COOKIE,
} from "@/domains/platform/tenancy/active-organization";
import { acceptInvitation } from "./membership.service";

export async function acceptInvitationAction(token: string): Promise<{ error: string } | never> {
  const user = await requireCurrentUser();

  let organizationId: string;
  try {
    const result = await acceptInvitation(user.id, user.email, token);
    organizationId = result.organizationId;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Something went wrong." };
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
