import { z } from "zod";

/** FormData renders every empty/unselected field as `""` — treat that as absent. */
function emptyToUndefined(value: unknown) {
  return value === "" || value === null ? undefined : value;
}

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().optional());

export const departmentSchema = z.object({
  name: z.string().trim().min(2, "Enter a name with at least 2 characters.").max(120),
  description: optionalText,
  color: optionalText,
});

export type DepartmentInput = z.infer<typeof departmentSchema>;
