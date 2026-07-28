import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import {
  loadActiveMembership,
  type ActiveMembership,
} from "@/domains/platform/authorization/policy";

export const ACTIVE_ORG_COOKIE = "adotkazi_active_org";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

/** Returns the signed-in user, or null if there is no valid session. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image ?? null,
  };
}

/** Redirects to sign-in unless the request carries a valid session. */
export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }
  return user;
}

/**
 * Resolves the caller's active organization membership.
 *
 * Tenant context for the authenticated app is session-based (see
 * MULTI_TENANCY.md "Active Organization"), not domain-based — domain/
 * subdomain resolution applies to the public careers site, added with the
 * Recruitment module. The `active_org` cookie is only a hint; membership is
 * always re-verified against the database on every call, so a stale or
 * tampered cookie can never grant access to an organization the user does
 * not belong to.
 */
export async function getActiveMembership(userId: string): Promise<ActiveMembership | null> {
  const cookieStore = await cookies();
  const hinted = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

  if (hinted) {
    const membership = await loadActiveMembership(userId, hinted);
    if (membership) return membership;
  }

  // No valid hint — fall back to the user's most recently active membership.
  const fallback = await prisma.membership.findFirst({
    where: { userId, status: "ACTIVE", deletedAt: null, organization: { deletedAt: null } },
    orderBy: [{ lastActiveAt: "desc" }, { joinedAt: "desc" }],
    select: { organizationId: true },
  });

  if (!fallback) return null;

  return loadActiveMembership(userId, fallback.organizationId);
}

/** Redirects to onboarding unless the user belongs to at least one organization. */
export async function requireActiveMembership(userId: string): Promise<ActiveMembership> {
  const membership = await getActiveMembership(userId);
  if (!membership) {
    redirect("/onboarding/organization");
  }
  return membership;
}
