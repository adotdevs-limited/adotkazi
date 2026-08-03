import { z } from "zod";

export const addNoteSchema = z.object({
  body: z.string().trim().min(1, "Write something first.").max(4000),
});

export type AddNoteInput = z.infer<typeof addNoteSchema>;
