import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Enter your organization's name.").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Enter a slug with at least 2 characters.")
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only."),
  country: z.string().trim().min(2, "Select your country."),
  timezone: z.string().trim().min(1, "Select your timezone."),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
