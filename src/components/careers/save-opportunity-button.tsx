"use client";

import { useActionState } from "react";
import { BookmarkIcon, BookmarkCheckIcon } from "lucide-react";

import {
  saveOpportunityAction,
  unsaveOpportunityAction,
  type SavedOpportunityActionState,
} from "@/domains/recruitment/saved-opportunities/saved-opportunity.actions";
import { Button } from "@/components/ui/button";

const initialState: SavedOpportunityActionState = { error: null };

export function SaveOpportunityButton({
  organizationSlug,
  opportunitySlug,
  savedOpportunityId,
}: {
  organizationSlug: string;
  opportunitySlug: string;
  savedOpportunityId: string | null;
}) {
  const [saveState, saveAction, isSaving] = useActionState(saveOpportunityAction, initialState);
  const [unsaveState, unsaveAction, isUnsaving] = useActionState(
    unsaveOpportunityAction,
    initialState,
  );

  if (savedOpportunityId) {
    return (
      <form action={unsaveAction} className="grid gap-1">
        <input type="hidden" name="savedOpportunityId" value={savedOpportunityId} />
        <input type="hidden" name="organizationSlug" value={organizationSlug} />
        <input type="hidden" name="opportunitySlug" value={opportunitySlug} />
        <Button type="submit" variant="outline" disabled={isUnsaving} className="w-fit">
          <BookmarkCheckIcon /> {isUnsaving ? "Removing…" : "Saved"}
        </Button>
        {unsaveState.error && <p className="text-destructive text-sm">{unsaveState.error}</p>}
      </form>
    );
  }

  return (
    <form action={saveAction} className="grid gap-1">
      <input type="hidden" name="organizationSlug" value={organizationSlug} />
      <input type="hidden" name="opportunitySlug" value={opportunitySlug} />
      <Button type="submit" variant="outline" disabled={isSaving} className="w-fit">
        <BookmarkIcon /> {isSaving ? "Saving…" : "Save"}
      </Button>
      {saveState.error && <p className="text-destructive text-sm">{saveState.error}</p>}
    </form>
  );
}
