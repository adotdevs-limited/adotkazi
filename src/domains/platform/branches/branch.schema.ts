import { z } from "zod";

/** FormData renders every empty/unselected field as `""` — treat that as absent. */
function emptyToUndefined(value: unknown) {
  return value === "" || value === null ? undefined : value;
}

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().optional());
const checkbox = z.preprocess((value) => value === "on" || value === "true", z.boolean());

const BRANCH_STATUSES = ["ACTIVE", "INACTIVE"] as const;

export const branchSchema = z.object({
  name: z.string().trim().min(2, "Enter a name with at least 2 characters.").max(120),
  code: optionalText,
  address: optionalText,
  city: optionalText,
  country: optionalText,
  isHeadquarters: checkbox,
  status: z.enum(BRANCH_STATUSES).default("ACTIVE"),
});

export type BranchInput = z.infer<typeof branchSchema>;

export const BRANCH_STATUS_OPTIONS = BRANCH_STATUSES;
