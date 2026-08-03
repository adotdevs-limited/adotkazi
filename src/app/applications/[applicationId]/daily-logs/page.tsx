import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { getCurrentUser } from "@/domains/platform/tenancy/active-organization";
import { getPlacementForCandidateApplication } from "@/domains/recruitment/placements/placement.service";
import { ApplicationNotFoundError } from "@/domains/recruitment/applications/application.service";
import { listDailyLogsForPlacement } from "@/domains/recruitment/daily-logs/daily-log.repository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyLogStatusBadge } from "@/components/applications/daily-log-status-badge";
import { SubmitDailyLogForm } from "@/components/applications/submit-daily-log-form";

export const metadata = { title: "Daily Logs" };

export default async function CandidateDailyLogsPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/sign-in?redirect=${encodeURIComponent(`/applications/${applicationId}/daily-logs`)}`);
  }

  let result: Awaited<ReturnType<typeof getPlacementForCandidateApplication>>;
  try {
    result = await getPlacementForCandidateApplication(user, applicationId);
  } catch (error) {
    if (error instanceof ApplicationNotFoundError) {
      notFound();
    }
    throw error;
  }

  const { application, placement } = result;
  if (!placement) {
    notFound();
  }

  const logs = await listDailyLogsForPlacement(placement.id);

  return (
    <div className="mx-auto grid w-full max-w-xl gap-6 px-4 py-16">
      <Link
        href="/applications"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
      >
        <ArrowLeftIcon className="size-4" /> My Applications
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{application.opportunity.title}</h1>
        <p className="text-muted-foreground text-sm">{application.opportunity.organization.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {placement.status === "ACTIVE" ? "Log today's activity" : "Daily logs"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {placement.status === "ACTIVE" ? (
            <SubmitDailyLogForm applicationId={applicationId} placementId={placement.id} />
          ) : (
            <p className="text-muted-foreground text-sm">
              Daily logs can only be submitted while your placement is active.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">History</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {logs.length === 0 && (
            <p className="text-muted-foreground text-sm">No logs submitted yet.</p>
          )}
          {logs.map((log) => (
            <div key={log.id} className="grid gap-1.5 border-b pb-4 last:border-b-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <DailyLogStatusBadge status={log.status} />
                <span className="text-sm font-medium">{log.date.toLocaleDateString()}</span>
                <span className="text-muted-foreground text-xs">{log.hoursWorked.toString()}h</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{log.activityDescription}</p>
              {log.reviewComment && (
                <p className="text-destructive text-xs">Returned: {log.reviewComment}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
