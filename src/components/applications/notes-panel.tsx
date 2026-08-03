"use client";

import { useActionState } from "react";

import { addNoteAction, type NoteActionState } from "@/domains/recruitment/notes/note.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TEXTAREA_CLASS =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-20 w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:ring-3";

export type NoteWithAuthor = {
  id: string;
  body: string;
  createdAt: Date;
  author: { user: { name: string } };
};

export function NotesPanel({
  applicationId,
  opportunityId,
  notes,
}: {
  applicationId: string;
  opportunityId: string;
  notes: NoteWithAuthor[];
}) {
  const initialState: NoteActionState = { error: null };
  const [state, formAction, isPending] = useActionState(
    addNoteAction.bind(null, opportunityId, applicationId),
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Notes</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {notes.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No notes yet. Leave one for the rest of the team.
          </p>
        ) : (
          <div className="grid gap-3">
            {notes.map((note) => (
              <div key={note.id} className="grid gap-0.5 text-sm">
                <p className="text-muted-foreground text-xs">
                  <span className="text-foreground font-medium">{note.author.user.name}</span> ·{" "}
                  {note.createdAt.toLocaleString()}
                </p>
                <p className="whitespace-pre-wrap">{note.body}</p>
              </div>
            ))}
          </div>
        )}

        <form key={notes.length} action={formAction} className="grid gap-2">
          <textarea
            name="body"
            placeholder="Leave a note for your team…"
            className={TEXTAREA_CLASS}
          />
          {state.fieldErrors?.body && (
            <p className="text-destructive text-xs">{state.fieldErrors.body}</p>
          )}
          {state.error && <p className="text-destructive text-sm">{state.error}</p>}
          <Button type="submit" size="sm" disabled={isPending} className="w-fit">
            {isPending ? "Posting…" : "Post note"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
