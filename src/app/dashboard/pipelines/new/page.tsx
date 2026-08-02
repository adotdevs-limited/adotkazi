import { redirect } from "next/navigation";

import {
  requireCurrentUser,
  requireActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import { can } from "@/domains/platform/authorization/policy";
import { PipelineForm } from "@/components/pipelines/pipeline-form";

export const metadata = { title: "New pipeline" };

export default async function NewPipelinePage() {
  const user = await requireCurrentUser();
  const membership = await requireActiveMembership(user.id);

  if (!can(membership, "pipeline.manage")) {
    redirect("/dashboard/pipelines");
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New pipeline</h1>
        <p className="text-muted-foreground text-sm">
          Create a recruitment pipeline. You can add stages once it&apos;s created.
        </p>
      </div>
      <PipelineForm mode="create" />
    </div>
  );
}
