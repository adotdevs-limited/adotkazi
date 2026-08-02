import { redirect } from "next/navigation";

import { getCurrentUser } from "@/domains/platform/tenancy/active-organization";
import { isGoogleOAuthConfigured } from "@/lib/env";
import { isSafeRedirectPath } from "@/lib/utils";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata = { title: "Create your account" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectParam } = await searchParams;
  const redirectTo = isSafeRedirectPath(redirectParam) ? redirectParam : "/dashboard";

  const user = await getCurrentUser();
  if (user) redirect(redirectTo);

  return <SignUpForm googleEnabled={isGoogleOAuthConfigured} redirectTo={redirectTo} />;
}
