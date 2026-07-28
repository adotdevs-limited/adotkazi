import { redirect } from "next/navigation";

import { getCurrentUser } from "@/domains/platform/tenancy/active-organization";
import { isGoogleOAuthConfigured } from "@/lib/env";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata = { title: "Create your account" };

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return <SignUpForm googleEnabled={isGoogleOAuthConfigured} />;
}
