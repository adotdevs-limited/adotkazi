import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import {
  requireCurrentUser,
  requireActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import { can } from "@/domains/platform/authorization/policy";
import {
  getPipelineDetail,
  PipelineNotFoundError,
} from "@/domains/recruitment/pipelines/pipeline.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PipelineForm } from "@/components/pipelines/pipeline-form";
import { PipelineActions } from "@/components/pipelines/pipeline-actions";
import { PipelineStageManager } from "@/components/pipelines/pipeline-stage-manager";

export const metadata = { title: "Pipeline" };

export default async function PipelineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireCurrentUser();
  const membership = await requireActiveMembership(user.id);

  if (!can(membership, "pipeline.manage")) {
    redirect("/dashboard");
  }

  let detail;
  try {
    detail = await getPipelineDetail(membership, id);
  } catch (error) {
    if (error instanceof PipelineNotFoundError) {
      notFound();
    }
    throw error;
  }

  const { pipeline, stages, opportunityCount } = detail;

  return (
    <div className="grid gap-6">
      <Button
        nativeButton={false}
        variant="ghost"
        className="w-fit"
        render={<Link href="/dashboard/pipelines" />}
      >
        <ArrowLeftIcon /> Pipelines
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{pipeline.name}</h1>
            {pipeline.isDefault && <Badge variant="secondary">Default</Badge>}
            {pipeline.isSystem && <Badge variant="outline">System</Badge>}
          </div>
          <p className="text-muted-foreground text-sm">
            {opportunityCount} {opportunityCount === 1 ? "opportunity uses" : "opportunities use"}{" "}
            this pipeline.
          </p>
        </div>
        <PipelineActions
          pipelineId={pipeline.id}
          isDefault={pipeline.isDefault}
          isSystem={pipeline.isSystem}
          opportunityCount={opportunityCount}
        />
      </div>

      <PipelineForm
        mode="edit"
        defaultValues={{
          id: pipeline.id,
          name: pipeline.name,
          description: pipeline.description ?? "",
        }}
      />

      <PipelineStageManager
        pipelineId={pipeline.id}
        stages={stages.map((stage) => ({
          id: stage.id,
          name: stage.name,
          order: stage.order,
          color: stage.color,
          isTerminal: stage.isTerminal,
          allowsFeedback: stage.allowsFeedback,
          applicationCount: stage._count.applications,
        }))}
      />
    </div>
  );
}
