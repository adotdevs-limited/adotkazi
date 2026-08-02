import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusIcon, WorkflowIcon } from "lucide-react";

import {
  requireCurrentUser,
  requireActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import { can } from "@/domains/platform/authorization/policy";
import { listPipelinesForOrganization } from "@/domains/recruitment/pipelines/pipeline.repository";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Pipelines" };

export default async function PipelinesPage() {
  const user = await requireCurrentUser();
  const membership = await requireActiveMembership(user.id);

  if (!can(membership, "pipeline.manage")) {
    redirect("/dashboard");
  }

  const pipelines = await listPipelinesForOrganization(membership.organizationId);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipelines</h1>
          <p className="text-muted-foreground text-sm">
            Recruitment pipelines for {membership.organizationName}.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/dashboard/pipelines/new" />}>
          <PlusIcon /> New pipeline
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {pipelines.length} {pipelines.length === 1 ? "pipeline" : "pipelines"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1">
          {pipelines.length === 0 && (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm">
              <WorkflowIcon className="size-6" />
              No pipelines yet.
            </div>
          )}
          {pipelines.map((pipeline) => (
            <Link
              key={pipeline.id}
              href={`/dashboard/pipelines/${pipeline.id}`}
              className="hover:bg-muted/50 flex items-center gap-3 rounded-lg px-2 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{pipeline.name}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {pipeline._count.stages} {pipeline._count.stages === 1 ? "stage" : "stages"}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {pipeline.isDefault && <Badge variant="secondary">Default</Badge>}
                {pipeline.isSystem && <Badge variant="outline">System</Badge>}
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
