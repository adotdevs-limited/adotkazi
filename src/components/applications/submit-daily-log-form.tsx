"use client";

import { useActionState } from "react";

import {
  submitDailyLogAction,
  type DailyLogActionState,
} from "@/domains/recruitment/daily-logs/daily-log.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TEXTAREA_CLASS =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-20 w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:ring-3";

export function SubmitDailyLogForm({
  applicationId,
  placementId,
}: {
  applicationId: string;
  placementId: string;
}) {
  const initialState: DailyLogActionState = { error: null };
  const [state, formAction, isPending] = useActionState(
    submitDailyLogAction.bind(null, applicationId, placementId),
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" required />
          {state.fieldErrors?.date && (
            <p className="text-destructive text-xs">{state.fieldErrors.date}</p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="hoursWorked">Hours worked</Label>
          <Input id="hoursWorked" name="hoursWorked" type="number" min="0" max="24" step="0.5" required />
          {state.fieldErrors?.hoursWorked && (
            <p className="text-destructive text-xs">{state.fieldErrors.hoursWorked}</p>
          )}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="activityDescription">What did you work on?</Label>
        <textarea
          id="activityDescription"
          name="activityDescription"
          required
          className={TEXTAREA_CLASS}
        />
        {state.fieldErrors?.activityDescription && (
          <p className="text-destructive text-xs">{state.fieldErrors.activityDescription}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="skillsLearned">Skills learned (optional)</Label>
        <textarea id="skillsLearned" name="skillsLearned" className={TEXTAREA_CLASS} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <textarea id="notes" name="notes" className={TEXTAREA_CLASS} />
      </div>

      {state.error && <p className="text-destructive text-sm">{state.error}</p>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Submitting…" : "Submit log"}
      </Button>
    </form>
  );
}
