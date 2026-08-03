import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import {
  requireCurrentUser,
  requireActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import { can } from "@/domains/platform/authorization/policy";
import {
  PlacementNotFoundError,
  getPlacementForSupervisor,
} from "@/domains/recruitment/placements/placement.service";
import { listDailyLogsForPlacement } from "@/domains/recruitment/daily-logs/daily-log.repository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlacementStatusBadge } from "@/components/applications/placement-status-badge";
import { DailyLogsPanel } from "@/components/applications/daily-logs-panel";

export const metadata = { title: "Placement" };

export default async function SupervisedPlacementPage({
  params,
}: {
  params: Promise<{ placementId: string }>;
}) {
  const { placementId } = await params;
  const user = await requireCurrentUser();
  const membership = await requireActiveMembership(user.id);

  if (!can(membership, "placement.view")) {
    redirect("/dashboard");
  }

  let placement: Awaited<ReturnType<typeof getPlacementForSupervisor>>;
  try {
    placement = await getPlacementForSupervisor(membership, placementId);
  } catch (error) {
    if (error instanceof PlacementNotFoundError) {
      notFound();
    }
    redirect("/dashboard/supervision");
  }

  const logs = (await listDailyLogsForPlacement(placement.id)).map((log) => ({
    ...log,
    hoursWorked: log.hoursWorked.toString(),
  }));
  const canReview =
    can(membership, "daily_log.review") &&
    (placement.supervisorMembershipId === membership.membershipId ||
      can(membership, "placement.manage"));

  return (
    <div className="grid gap-6">
      <Button
        nativeButton={false}
        variant="ghost"
        className="w-fit"
        render={<Link href="/dashboard/supervision" />}
      >
        <ArrowLeftIcon /> My supervision
      </Button>

      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {placement.application.candidate.user.name}
        </h1>
        <PlacementStatusBadge status={placement.status} />
      </div>
      <p className="text-muted-foreground -mt-4 text-sm">
        {placement.application.candidate.user.email} · {placement.application.opportunity.title}
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Placement</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {placement.startDate ? (
            <p>
              {placement.startDate.toLocaleDateString()}
              {placement.endDate ? ` – ${placement.endDate.toLocaleDateString()}` : ""}
            </p>
          ) : (
            <p>No start date recorded yet.</p>
          )}
        </CardContent>
      </Card>

      <DailyLogsPanel
        applicationId={placement.application.id}
        opportunityId={placement.application.opportunity.id}
        logs={logs}
        canReview={canReview}
      />
    </div>
  );
}
