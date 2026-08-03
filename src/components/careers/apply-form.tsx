"use client";

import { useActionState } from "react";

import {
  submitApplicationAction,
  type ApplicationActionState,
} from "@/domains/recruitment/applications/application.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TEXTAREA_CLASS =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-24 w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:ring-3";
const FILE_INPUT_CLASS =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 file:text-foreground w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-sm outline-none file:mr-2 file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-3";

export function ApplyForm({
  organizationSlug,
  opportunitySlug,
  isPlacementTrack = false,
}: {
  organizationSlug: string;
  opportunitySlug: string;
  /** IPT/internship-track opportunities require university info + a
   *  transcript at application time (IPT_MODULE.txt). */
  isPlacementTrack?: boolean;
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

      {isPlacementTrack && (
        <div className="grid gap-4 border-t pt-4">
          <p className="text-sm font-medium">University information</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="institution">Institution</Label>
              <Input id="institution" name="institution" required />
              {state.fieldErrors?.institution && (
                <p className="text-destructive text-sm">{state.fieldErrors.institution}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="program">Program</Label>
              <Input id="program" name="program" required />
              {state.fieldErrors?.program && (
                <p className="text-destructive text-sm">{state.fieldErrors.program}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="levelOfStudy">Level of study</Label>
              <Input id="levelOfStudy" name="levelOfStudy" placeholder="Undergraduate" required />
              {state.fieldErrors?.levelOfStudy && (
                <p className="text-destructive text-sm">{state.fieldErrors.levelOfStudy}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="yearOfStudy">Year of study</Label>
              <Input id="yearOfStudy" name="yearOfStudy" type="number" min="1" required />
              {state.fieldErrors?.yearOfStudy && (
                <p className="text-destructive text-sm">{state.fieldErrors.yearOfStudy}</p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="academicTranscript">Academic transcript</Label>
            <input
              id="academicTranscript"
              name="academicTranscript"
              type="file"
              required
              accept=".pdf,.doc,.docx"
              className={FILE_INPUT_CLASS}
            />
            <p className="text-muted-foreground text-xs">PDF, DOC, or DOCX. Max 5MB.</p>
            {state.fieldErrors?.academicTranscript && (
              <p className="text-destructive text-sm">{state.fieldErrors.academicTranscript}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="recommendationLetter">Recommendation letter (optional)</Label>
            <input
              id="recommendationLetter"
              name="recommendationLetter"
              type="file"
              accept=".pdf,.doc,.docx"
              className={FILE_INPUT_CLASS}
            />
            {state.fieldErrors?.recommendationLetter && (
              <p className="text-destructive text-sm">{state.fieldErrors.recommendationLetter}</p>
            )}
          </div>
        </div>
      )}

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
