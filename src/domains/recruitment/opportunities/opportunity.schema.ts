import { z } from "zod";

const OPPORTUNITY_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
  "GRADUATE_PROGRAM",
  "APPRENTICESHIP",
  "VOLUNTEER",
] as const;

const WORKPLACE_TYPES = ["ON_SITE", "REMOTE", "HYBRID"] as const;

const EXPERIENCE_LEVELS = ["ENTRY", "JUNIOR", "MID", "SENIOR", "LEAD", "EXECUTIVE"] as const;

const OPPORTUNITY_VISIBILITIES = [
  "PUBLIC",
  "ORGANIZATION_ONLY",
  "INVITATION_ONLY",
  "PRIVATE_DRAFT",
] as const;

/** FormData renders every empty/unselected field as `""` — treat that as absent. */
function emptyToUndefined(value: unknown) {
  return value === "" || value === null ? undefined : value;
}

const optionalUuid = z.preprocess(emptyToUndefined, z.uuid().optional());
const optionalText = z.preprocess(emptyToUndefined, z.string().trim().optional());
const optionalNumber = z.preprocess(emptyToUndefined, z.coerce.number().optional());
const optionalDate = z.preprocess(emptyToUndefined, z.coerce.date().optional());

export const createOpportunitySchema = z.object({
  title: z.string().trim().min(3, "Enter a title with at least 3 characters.").max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Enter a slug with at least 2 characters.")
    .max(160)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only."),
  departmentId: z.uuid("Select a department."),
  branchId: optionalUuid,
  pipelineId: optionalUuid,
  hiringTeamId: optionalUuid,

  opportunityType: z.enum(OPPORTUNITY_TYPES, "Select an opportunity type."),
  workplaceType: z.enum(WORKPLACE_TYPES, "Select a workplace type."),
  experienceLevel: z.preprocess(emptyToUndefined, z.enum(EXPERIENCE_LEVELS).optional()),
  location: optionalText,
  openings: z.coerce.number().int().min(1).default(1),
  salaryMin: optionalNumber,
  salaryMax: optionalNumber,
  currency: z.preprocess(emptyToUndefined, z.string().trim().length(3).optional()),

  applicationDeadline: optionalDate,

  description: optionalText,
  responsibilities: optionalText,
  requirements: optionalText,
  benefits: optionalText,

  visibility: z.enum(OPPORTUNITY_VISIBILITIES).default("PUBLIC"),

  // Single comma-separated input for phase 1 — a proper tag combobox is a
  // nice-to-have for later, not core.
  skills: optionalText,
});

export const updateOpportunitySchema = createOpportunitySchema;

export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;
export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;

export const OPPORTUNITY_TYPE_OPTIONS = OPPORTUNITY_TYPES;
export const WORKPLACE_TYPE_OPTIONS = WORKPLACE_TYPES;
export const EXPERIENCE_LEVEL_OPTIONS = EXPERIENCE_LEVELS;
export const OPPORTUNITY_VISIBILITY_OPTIONS = OPPORTUNITY_VISIBILITIES;
