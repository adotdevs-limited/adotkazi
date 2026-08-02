import { z } from "zod";

const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5MB, per FILE_STORAGE.txt's "File Validation".
const ALLOWED_RESUME_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ALLOWED_RESUME_EXTENSIONS = [".pdf", ".doc", ".docx"];

/** FormData renders every empty/unselected field as `""` — treat that as absent. */
function emptyToUndefined(value: unknown) {
  return value === "" || value === null ? undefined : value;
}

export const submitApplicationSchema = z.object({
  organizationSlug: z.string().trim().min(1, "Missing organization."),
  opportunitySlug: z.string().trim().min(1, "Missing opportunity."),
  coverNote: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(4000, "Keep your note under 4,000 characters.").optional(),
  ),
});

export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;

export class InvalidResumeFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidResumeFileError";
  }
}

/** Validates a resume `File` pulled from FormData, returning it narrowed on success. */
export function validateResumeFile(value: FormDataEntryValue | null): File {
  if (!(value instanceof File) || value.size === 0) {
    throw new InvalidResumeFileError("Attach your resume.");
  }
  if (value.size > MAX_RESUME_BYTES) {
    throw new InvalidResumeFileError("Your resume must be smaller than 5MB.");
  }

  const extension = value.name.slice(value.name.lastIndexOf(".")).toLowerCase();
  const typeAllowed =
    ALLOWED_RESUME_MIME_TYPES.has(value.type) || ALLOWED_RESUME_EXTENSIONS.includes(extension);
  if (!typeAllowed) {
    throw new InvalidResumeFileError("Upload a PDF, DOC, or DOCX file.");
  }

  return value;
}
