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

const optionalText = z.preprocess(
  emptyToUndefined,
  z.string().trim().max(200, "Keep this under 200 characters.").optional(),
);

export const submitApplicationSchema = z.object({
  organizationSlug: z.string().trim().min(1, "Missing organization."),
  opportunitySlug: z.string().trim().min(1, "Missing opportunity."),
  coverNote: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(4000, "Keep your note under 4,000 characters.").optional(),
  ),
  // IPT_MODULE.txt "Application Process" fields — only required for
  // placement-track opportunities, enforced in application.service.ts
  // since that's where the opportunity type is known.
  institution: optionalText,
  program: optionalText,
  levelOfStudy: optionalText,
  yearOfStudy: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().optional()),
});

export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;

export class InvalidResumeFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidResumeFileError";
  }
}

/** Validates a document `File` pulled from FormData against the shared
 *  size/type constraints. `required: false` allows an absent/empty file
 *  through (returns undefined) — used for documents that are optional
 *  regardless of opportunity type (e.g. recommendation letter). */
function validateDocumentFile(
  value: FormDataEntryValue | null,
  label: string,
  required: true,
): File;
function validateDocumentFile(
  value: FormDataEntryValue | null,
  label: string,
  required: false,
): File | undefined;
function validateDocumentFile(
  value: FormDataEntryValue | null,
  label: string,
  required: boolean,
): File | undefined {
  if (!(value instanceof File) || value.size === 0) {
    if (required) {
      throw new InvalidResumeFileError(`Attach your ${label}.`);
    }
    return undefined;
  }
  if (value.size > MAX_RESUME_BYTES) {
    throw new InvalidResumeFileError(`Your ${label} must be smaller than 5MB.`);
  }

  const extension = value.name.slice(value.name.lastIndexOf(".")).toLowerCase();
  const typeAllowed =
    ALLOWED_RESUME_MIME_TYPES.has(value.type) || ALLOWED_RESUME_EXTENSIONS.includes(extension);
  if (!typeAllowed) {
    throw new InvalidResumeFileError(`Upload your ${label} as a PDF, DOC, or DOCX file.`);
  }

  return value;
}

/** Validates a resume `File` pulled from FormData, returning it narrowed on success. */
export function validateResumeFile(value: FormDataEntryValue | null): File {
  return validateDocumentFile(value, "resume", true);
}

/** File-shape validation only — whether a transcript is *required* for
 *  this opportunity is a business rule the service layer enforces once
 *  it knows the opportunity's type (see MissingApplicationFieldsError). */
export function validateAcademicTranscriptFile(value: FormDataEntryValue | null): File | undefined {
  return validateDocumentFile(value, "academic transcript", false);
}

export function validateRecommendationLetterFile(value: FormDataEntryValue | null): File | undefined {
  return validateDocumentFile(value, "recommendation letter", false);
}
