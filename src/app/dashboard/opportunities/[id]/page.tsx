import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PencilIcon } from "lucide-react";

import {
  requireCurrentUser,
  requireActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import { can } from "@/domains/platform/authorization/policy";
import { findOpportunityById } from "@/domains/recruitment/opportunities/opportunity.repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OpportunityStatusBadge } from "@/components/opportunities/opportunity-status-badge";
import { OpportunityLifecycleActions } from "@/components/opportunities/opportunity-lifecycle-actions";

export const metadata = { title: "Opportunity" };

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireCurrentUser();
  const membership = await requireActiveMembership(user.id);

  if (!can(membership, "opportunity.view")) {
    redirect("/dashboard/opportunities");
  }

  const opportunity = await findOpportunityById(id, membership.organizationId);
  if (!opportunity) {
    notFound();
  }

  const canUpdate = can(membership, "opportunity.update");

  return (
    <div className="grid gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{opportunity.title}</h1>
            <OpportunityStatusBadge status={opportunity.status} />
          </div>
          <p className="text-muted-foreground text-sm">
            {opportunity.department.name}
            {opportunity.branch ? ` · ${opportunity.branch.name}` : ""} ·{" "}
            {opportunity.opportunityType.replaceAll("_", " ")} ·{" "}
            {opportunity.workplaceType.replaceAll("_", " ")}
          </p>
        </div>
        {canUpdate && opportunity.status !== "CLOSED" && opportunity.status !== "ARCHIVED" && (
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`/dashboard/opportunities/${opportunity.id}/edit`} />}
          >
            <PencilIcon /> Edit
          </Button>
        )}
      </div>

      <OpportunityLifecycleActions
        opportunityId={opportunity.id}
        status={opportunity.status}
        canUpdate={can(membership, "opportunity.update")}
        canPublish={can(membership, "opportunity.publish")}
        canArchive={can(membership, "opportunity.archive")}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <Field label="Openings" value={String(opportunity.openings)} />
          <Field label="Experience level" value={opportunity.experienceLevel ?? "—"} />
          <Field label="Location" value={opportunity.location ?? "—"} />
          <Field
            label="Salary range"
            value={
              opportunity.salaryMin || opportunity.salaryMax
                ? `${opportunity.salaryMin ?? "?"} – ${opportunity.salaryMax ?? "?"} ${opportunity.currency ?? ""}`
                : "—"
            }
          />
          <Field
            label="Application deadline"
            value={
              opportunity.applicationDeadline
                ? opportunity.applicationDeadline.toLocaleDateString()
                : "—"
            }
          />
          <Field label="Visibility" value={opportunity.visibility.replaceAll("_", " ")} />
          <Field label="Pipeline" value={opportunity.pipeline.name} />
          <Field
            label="Skills"
            value={
              opportunity.skillRequirements.length > 0
                ? opportunity.skillRequirements
                    .map((requirement) => requirement.skill.name)
                    .join(", ")
                : "—"
            }
          />
        </CardContent>
      </Card>

      {opportunity.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Description</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">
            {opportunity.description}
          </CardContent>
        </Card>
      )}

      {opportunity.responsibilities && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Responsibilities</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">
            {opportunity.responsibilities}
          </CardContent>
        </Card>
      )}

      {opportunity.requirements && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Requirements</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">
            {opportunity.requirements}
          </CardContent>
        </Card>
      )}

      {opportunity.benefits && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Benefits</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{opportunity.benefits}</CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
