"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { DailyLog } from "@/generated/prisma/client";
import {
  approveDailyLogAction,
  returnDailyLogAction,
  type DailyLogActionState,
} from "@/domains/recruitment/daily-logs/daily-log.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DailyLogStatusBadge } from "@/components/applications/daily-log-status-badge";

const TEXTAREA_CLASS =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-16 w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:ring-3";

export function DailyLogsPanel({
  applicationId,
  opportunityId,
  logs,
  canReview,
}: {
  applicationId: string;
  opportunityId: string;
  logs: DailyLog[];
  canReview: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Daily Logs</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {logs.length === 0 && (
          <p className="text-muted-foreground text-sm">No daily logs submitted yet.</p>
        )}
        {logs.map((log) => (
          <DailyLogRow
            key={log.id}
            log={log}
            applicationId={applicationId}
            opportunityId={opportunityId}
            canReview={canReview}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function DailyLogRow({
  log,
  applicationId,
  opportunityId,
  canReview,
}: {
  log: DailyLog;
  applicationId: string;
  opportunityId: string;
  canReview: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [showReturnForm, setShowReturnForm] = React.useState(false);

  function approve() {
    startTransition(async () => {
      const result = await approveDailyLogAction(opportunityId, applicationId, log.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="grid gap-1.5 border-b pb-4 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <DailyLogStatusBadge status={log.status} />
        <span className="text-sm font-medium">{log.date.toLocaleDateString()}</span>
        <span className="text-muted-foreground text-xs">{log.hoursWorked.toString()}h</span>
      </div>
      <p className="text-sm whitespace-pre-wrap">{log.activityDescription}</p>
      {log.skillsLearned && (
        <p className="text-muted-foreground text-xs">Skills learned: {log.skillsLearned}</p>
      )}
      {log.notes && <p className="text-muted-foreground text-xs">Notes: {log.notes}</p>}
      {log.reviewComment && (
        <p className="text-destructive text-xs">Returned: {log.reviewComment}</p>
      )}

      {canReview && log.status === "SUBMITTED" && (
        <div className="grid gap-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={isPending} onClick={approve}>
              Approve
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() => setShowReturnForm((value) => !value)}
            >
              Return for revision
            </Button>
          </div>
          {showReturnForm && (
            <ReturnLogForm
              applicationId={applicationId}
              opportunityId={opportunityId}
              dailyLogId={log.id}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ReturnLogForm({
  applicationId,
  opportunityId,
  dailyLogId,
}: {
  applicationId: string;
  opportunityId: string;
  dailyLogId: string;
}) {
  const initialState: DailyLogActionState = { error: null };
  const [state, formAction, isPending] = useActionState(
    returnDailyLogAction.bind(null, opportunityId, applicationId, dailyLogId),
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-2">
      <textarea
        name="comment"
        placeholder="Explain what needs revising…"
        className={TEXTAREA_CLASS}
      />
      {state.fieldErrors?.comment && (
        <p className="text-destructive text-xs">{state.fieldErrors.comment}</p>
      )}
      {state.error && <p className="text-destructive text-xs">{state.error}</p>}
      <Button type="submit" size="sm" variant="outline" disabled={isPending} className="w-fit">
        {isPending ? "Sending…" : "Send back"}
      </Button>
    </form>
  );
}
