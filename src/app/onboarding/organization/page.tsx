import { redirect } from "next/navigation";

import {
  requireCurrentUser,
  getActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import { CreateOrganizationForm } from "@/components/organizations/create-organization-form";

export const metadata = { title: "Create your organization" };

export default async function OnboardingOrganizationPage() {
  const user = await requireCurrentUser();
  const membership = await getActiveMembership(user.id);
  if (membership) redirect("/dashboard");

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <CreateOrganizationForm />
      </div>
    </div>
  );
}
