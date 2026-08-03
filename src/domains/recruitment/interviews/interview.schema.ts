import { z } from "zod";

function emptyToUndefined(value: unknown) {
  return value === "" || value === null ? undefined : value;
}

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().max(500).optional());

export const INTERVIEW_TYPE_OPTIONS = [
  "PHONE",
  "VIDEO",
  "IN_PERSON",
  "TECHNICAL",
  "PANEL",
  "ASSESSMENT_REVIEW",
] as const;

export const scheduleInterviewSchema = z
  .object({
    interviewType: z.enum(INTERVIEW_TYPE_OPTIONS),
    scheduledStart: z.coerce.date(),
    scheduledEnd: z.coerce.date(),
    meetingProvider: optionalText,
    meetingLink: optionalText,
    location: optionalText,
    interviewerMembershipIds: z.array(z.string().uuid()).min(1, "Assign at least one interviewer."),
  })
  .refine((data) => data.scheduledEnd > data.scheduledStart, {
    message: "The end time must be after the start time.",
    path: ["scheduledEnd"],
  });

export type ScheduleInterviewInput = z.infer<typeof scheduleInterviewSchema>;

export const INTERVIEW_RECOMMENDATION_OPTIONS = ["STRONG_YES", "YES", "NO", "STRONG_NO"] as const;

export const submitFeedbackSchema = z.object({
  recommendation: z.enum(INTERVIEW_RECOMMENDATION_OPTIONS),
  comments: z.preprocess(emptyToUndefined, z.string().trim().max(4000).optional()),
});

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;
