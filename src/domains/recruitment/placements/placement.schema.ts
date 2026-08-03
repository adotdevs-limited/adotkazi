import { z } from "zod";

function emptyToUndefined(value: unknown) {
  return value === "" || value === null ? undefined : value;
}

const optionalDate = z.preprocess(emptyToUndefined, z.coerce.date().optional());

export const createPlacementSchema = z
  .object({
    startDate: optionalDate,
    endDate: optionalDate,
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate > data.startDate, {
    message: "The end date must be after the start date.",
    path: ["endDate"],
  });

export type CreatePlacementInput = z.infer<typeof createPlacementSchema>;

export const assignSupervisorSchema = z.object({
  supervisorMembershipId: z.uuid("Select a supervisor."),
});

export type AssignSupervisorInput = z.infer<typeof assignSupervisorSchema>;
