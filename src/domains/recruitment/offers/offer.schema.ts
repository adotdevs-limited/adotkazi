import { z } from "zod";

function emptyToUndefined(value: unknown) {
  return value === "" || value === null ? undefined : value;
}

const optionalNumber = z.preprocess(emptyToUndefined, z.coerce.number().positive().optional());
const optionalDate = z.preprocess(emptyToUndefined, z.coerce.date().optional());
const optionalText = z.preprocess(emptyToUndefined, z.string().trim().max(10).optional());

export const extendOfferSchema = z
  .object({
    salary: optionalNumber,
    currency: optionalText,
    startDate: optionalDate,
    expiresAt: optionalDate,
  })
  .refine((data) => !data.expiresAt || data.expiresAt > new Date(), {
    message: "The expiry date must be in the future.",
    path: ["expiresAt"],
  });

export type ExtendOfferInput = z.infer<typeof extendOfferSchema>;
