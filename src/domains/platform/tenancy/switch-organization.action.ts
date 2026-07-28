"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { requireCurrentUser } from "./active-organization";
import { ACTIVE_ORG_COOKIE } from "./active-organization";

/**
 * Switches the caller's active organization. Verifies membership before
 * trusting the requested organization id — never set the cookie on the
 * strength of client input alone.
 */
export async function switchActiveOrganization(organizationId: string): Promise<void> {
  const user = await requireCurrentUser();

  const membership = await prisma.membership.findFirst({
    where: {
      userId: user.id,
      organizationId,
      status: "ACTIVE",
      deletedAt: null,
      organization: { deletedAt: null },
    },
    select: { id: true },
  });

  if (!membership) {
    throw new Error("You are not a member of that organization.");
  }

  await prisma.membership.update({
    where: { id: membership.id },
    data: { lastActiveAt: new Date() },
  });

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
