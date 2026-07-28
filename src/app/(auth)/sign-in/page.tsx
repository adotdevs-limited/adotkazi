import { redirect } from "next/navigation";

import { getCurrentUser } from "@/domains/platform/tenancy/active-organization";
import { isGoogleOAuthConfigured } from "@/lib/env";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return <SignInForm googleEnabled={isGoogleOAuthConfigured} />;
}
