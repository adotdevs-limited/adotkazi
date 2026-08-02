import { redirect } from "next/navigation";

import { getCurrentUser } from "@/domains/platform/tenancy/active-organization";
import { isGoogleOAuthConfigured } from "@/lib/env";
import { isSafeRedirectPath } from "@/lib/utils";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectParam } = await searchParams;
  const redirectTo = isSafeRedirectPath(redirectParam) ? redirectParam : "/dashboard";

  const user = await getCurrentUser();
  if (user) redirect(redirectTo);

  return <SignInForm googleEnabled={isGoogleOAuthConfigured} redirectTo={redirectTo} />;
}
