"use client";

import { useActionState } from "react";

import {
  submitApplicationAction,
  type ApplicationActionState,
} from "@/domains/recruitment/applications/application.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const TEXTAREA_CLASS =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-24 w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:ring-3";
const FILE_INPUT_CLASS =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 file:text-foreground w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-sm outline-none file:mr-2 file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-3";

export function ApplyForm({
  organizationSlug,
  opportunitySlug,
}: {
  organizationSlug: string;
  opportunitySlug: string;
}) {
  const initialState: ApplicationActionState = { error: null };
  const [state, formAction, isPending] = useActionState(submitApplicationAction, initialState);

  if (state.success) {
    return (
      <p className="text-sm font-medium">You applied to this opportunity. Good luck!</p>
    );
  }

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="organizationSlug" value={organizationSlug} />
      <input type="hidden" name="opportunitySlug" value={opportunitySlug} />

      <div className="grid gap-2">
        <Label htmlFor="resume">Resume</Label>
        <input
          id="resume"
          name="resume"
          type="file"
          required
          accept=".pdf,.doc,.docx"
          className={FILE_INPUT_CLASS}
        />
        <p className="text-muted-foreground text-xs">PDF, DOC, or DOCX. Max 5MB.</p>
        {state.fieldErrors?.resume && (
          <p className="text-destructive text-sm">{state.fieldErrors.resume}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="coverNote">Cover note (optional)</Label>
        <textarea
          id="coverNote"
          name="coverNote"
          placeholder="Tell us why you're a great fit for this role."
          className={TEXTAREA_CLASS}
        />
        {state.fieldErrors?.coverNote && (
          <p className="text-destructive text-sm">{state.fieldErrors.coverNote}</p>
        )}
      </div>

      {state.error && <p className="text-destructive text-sm">{state.error}</p>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}
