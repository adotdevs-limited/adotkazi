import { z } from "zod";

/** FormData renders every empty/unselected field as `""` — treat that as absent. */
function emptyToUndefined(value: unknown) {
  return value === "" || value === null ? undefined : value;
}

const optionalText = z.preprocess(emptyToUndefined, z.string().trim().optional());
const checkbox = z.preprocess((value) => value === "on" || value === "true", z.boolean());

export const pipelineSchema = z.object({
  name: z.string().trim().min(2, "Enter a name with at least 2 characters.").max(120),
  description: optionalText,
});

export type PipelineInput = z.infer<typeof pipelineSchema>;

export const pipelineStageSchema = z.object({
  name: z.string().trim().min(1, "Enter a stage name.").max(80),
  color: optionalText,
  isTerminal: checkbox,
  allowsFeedback: checkbox,
});

export type PipelineStageInput = z.infer<typeof pipelineStageSchema>;
