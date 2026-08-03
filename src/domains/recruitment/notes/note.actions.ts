"use server";

import { revalidatePath } from "next/cache";

import {
  requireCurrentUser,
  getActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import { addNoteSchema } from "./note.schema";
import { addNote } from "./note.service";

export type NoteActionState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

export async function addNoteAction(
  opportunityId: string,
  applicationId: string,
  _prevState: NoteActionState,
  formData: FormData,
): Promise<NoteActionState> {
  const parsed = addNoteSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return {
      error: null,
      fieldErrors: { body: parsed.error.flatten().fieldErrors.body?.[0] ?? "Invalid value." },
    };
  }

  const user = await requireCurrentUser();
  const membership = await getActiveMembership(user.id);
  if (!membership) {
    return { error: "You must belong to an organization to leave notes." };
  }

  try {
    await addNote(membership, applicationId, parsed.data);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }

  revalidatePath(`/dashboard/opportunities/${opportunityId}/applications/${applicationId}`);
  return { error: null };
}
