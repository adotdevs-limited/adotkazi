import { z } from "zod";

export const saveOpportunitySchema = z.object({
  organizationSlug: z.string().trim().min(1, "Missing organization."),
  opportunitySlug: z.string().trim().min(1, "Missing opportunity."),
});

export type SaveOpportunityInput = z.infer<typeof saveOpportunitySchema>;
