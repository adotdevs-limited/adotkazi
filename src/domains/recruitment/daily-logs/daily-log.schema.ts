import { z } from "zod";

function emptyToUndefined(value: unknown) {
  return value === "" || value === null ? undefined : value;
}

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional());

export const submitDailyLogSchema = z.object({
  date: z.coerce.date(),
  activityDescription: z
    .string()
    .trim()
    .min(1, "Describe what you worked on.")
    .max(4000, "Keep the description under 4,000 characters."),
  skillsLearned: optionalText,
  hoursWorked: z.coerce
    .number()
    .positive("Enter the hours worked.")
    .max(24, "Hours worked can't exceed 24."),
  notes: optionalText,
});

export type SubmitDailyLogInput = z.infer<typeof submitDailyLogSchema>;

export const returnDailyLogSchema = z.object({
  comment: z.string().trim().min(1, "Explain what needs revising.").max(2000),
});

export type ReturnDailyLogInput = z.infer<typeof returnDailyLogSchema>;
