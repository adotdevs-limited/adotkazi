import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon, UsersIcon } from "lucide-react";

import {
  requireCurrentUser,
  requireActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import { can } from "@/domains/platform/authorization/policy";
import { findOpportunityById } from "@/domains/recruitment/opportunities/opportunity.repository";
import { listApplicationsForOpportunity } from "@/domains/recruitment/applications/application.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";

export const metadata = { title: "Applicants" };

export default async function OpportunityApplicationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireCurrentUser();
  const membership = await requireActiveMembership(user.id);

  if (!can(membership, "application.view")) {
    redirect(`/dashboard/opportunities/${id}`);
  }

  const opportunity = await findOpportunityById(id, membership.organizationId);
  if (!opportunity) {
    notFound();
  }

  const applications = await listApplicationsForOpportunity(membership, id);

  return (
    <div className="grid gap-6">
      <Button
        nativeButton={false}
        variant="ghost"
        className="w-fit"
        render={<Link href={`/dashboard/opportunities/${id}`} />}
      >
        <ArrowLeftIcon /> {opportunity.title}
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Applicants</h1>
        <p className="text-muted-foreground text-sm">for {opportunity.title}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {applications.length} {applications.length === 1 ? "applicant" : "applicants"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1">
          {applications.length === 0 && (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm">
              <UsersIcon className="size-6" />
              No applications yet.
            </div>
          )}
          {applications.map((application) => (
            <Link
              key={application.id}
              href={`/dashboard/opportunities/${id}/applications/${application.id}`}
              className="hover:bg-muted/50 flex items-center gap-3 rounded-lg px-2 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{application.candidate.user.name}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {application.candidate.user.email}
                </p>
              </div>
              <span className="text-muted-foreground text-xs">
                {application.currentStage?.name ?? "—"}
              </span>
              <span className="text-muted-foreground text-xs">
                {application.appliedAt.toLocaleDateString()}
              </span>
              <ApplicationStatusBadge status={application.status} />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
