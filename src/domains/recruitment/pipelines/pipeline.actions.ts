"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  requireCurrentUser,
  getActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import type { ActiveMembership } from "@/domains/platform/authorization/policy";
import { pipelineSchema, pipelineStageSchema } from "./pipeline.schema";
import {
  createPipeline,
  createPipelineStage,
  deletePipeline,
  deletePipelineStage,
  movePipelineStage,
  setDefaultPipeline,
  updatePipeline,
  updatePipelineStage,
} from "./pipeline.service";

export type PipelineActionState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
  success?: boolean;
};

function fieldErrorsFromIssues(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

export async function createPipelineAction(
  _prevState: PipelineActionState,
  formData: FormData,
): Promise<PipelineActionState> {
  const user = await requireCurrentUser();
  const membership = await getActiveMembership(user.id);
  if (!membership) {
    return { error: "You must belong to an organization to create pipelines." };
  }

  const parsed = pipelineSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFromIssues(parsed.error.issues) };
  }

  let pipelineId: string;
  try {
    const pipeline = await createPipeline(membership, parsed.data);
    pipelineId = pipeline.id;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }

  revalidatePath("/dashboard/pipelines");
  redirect(`/dashboard/pipelines/${pipelineId}`);
}

export async function updatePipelineAction(
  _prevState: PipelineActionState,
  formData: FormData,
): Promise<PipelineActionState> {
  const user = await requireCurrentUser();
  const membership = await getActiveMembership(user.id);
  if (!membership) {
    return { error: "You must belong to an organization to edit pipelines." };
  }

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { error: "Missing pipeline id." };
  }

  const parsed = pipelineSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFromIssues(parsed.error.issues) };
  }

  try {
    await updatePipeline(membership, id, parsed.data);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }

  revalidatePath("/dashboard/pipelines");
  revalidatePath(`/dashboard/pipelines/${id}`);
  return { error: null };
}

export type PipelineLifecycleState = { error: string | null };

async function runPipelineLifecycleAction(
  pipelineId: string,
  perform: (membership: ActiveMembership) => Promise<unknown>,
): Promise<PipelineLifecycleState> {
  const user = await requireCurrentUser();
  const membership = await getActiveMembership(user.id);
  if (!membership) {
    return { error: "You must belong to an organization to manage pipelines." };
  }

  try {
    await perform(membership);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }

  revalidatePath("/dashboard/pipelines");
  revalidatePath(`/dashboard/pipelines/${pipelineId}`);
  return { error: null };
}

export async function deletePipelineAction(pipelineId: string): Promise<PipelineLifecycleState> {
  const result = await runPipelineLifecycleAction(pipelineId, (membership) =>
    deletePipeline(membership, pipelineId),
  );
  if (!result.error) {
    redirect("/dashboard/pipelines");
  }
  return result;
}

export async function setDefaultPipelineAction(pipelineId: string): Promise<PipelineLifecycleState> {
  return runPipelineLifecycleAction(pipelineId, (membership) =>
    setDefaultPipeline(membership, pipelineId),
  );
}

function readStageFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    color: formData.get("color"),
    isTerminal: formData.get("isTerminal"),
    allowsFeedback: formData.get("allowsFeedback"),
  };
}

export async function createPipelineStageAction(
  _prevState: PipelineActionState,
  formData: FormData,
): Promise<PipelineActionState> {
  const user = await requireCurrentUser();
  const membership = await getActiveMembership(user.id);
  if (!membership) {
    return { error: "You must belong to an organization to manage pipelines." };
  }

  const pipelineId = formData.get("pipelineId");
  if (typeof pipelineId !== "string" || !pipelineId) {
    return { error: "Missing pipeline id." };
  }

  const parsed = pipelineStageSchema.safeParse(readStageFormData(formData));
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFromIssues(parsed.error.issues) };
  }

  try {
    await createPipelineStage(membership, pipelineId, parsed.data);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }

  revalidatePath(`/dashboard/pipelines/${pipelineId}`);
  return { error: null, success: true };
}

export async function updatePipelineStageAction(
  _prevState: PipelineActionState,
  formData: FormData,
): Promise<PipelineActionState> {
  const user = await requireCurrentUser();
  const membership = await getActiveMembership(user.id);
  if (!membership) {
    return { error: "You must belong to an organization to manage pipelines." };
  }

  const pipelineId = formData.get("pipelineId");
  const stageId = formData.get("stageId");
  if (typeof pipelineId !== "string" || !pipelineId || typeof stageId !== "string" || !stageId) {
    return { error: "Missing pipeline or stage id." };
  }

  const parsed = pipelineStageSchema.safeParse(readStageFormData(formData));
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFromIssues(parsed.error.issues) };
  }

  try {
    await updatePipelineStage(membership, pipelineId, stageId, parsed.data);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }

  revalidatePath(`/dashboard/pipelines/${pipelineId}`);
  return { error: null, success: true };
}

export async function deletePipelineStageAction(
  pipelineId: string,
  stageId: string,
): Promise<PipelineLifecycleState> {
  return runPipelineLifecycleAction(pipelineId, (membership) =>
    deletePipelineStage(membership, pipelineId, stageId),
  );
}

export async function movePipelineStageAction(
  pipelineId: string,
  stageId: string,
  direction: "up" | "down",
): Promise<PipelineLifecycleState> {
  return runPipelineLifecycleAction(pipelineId, (membership) =>
    movePipelineStage(membership, pipelineId, stageId, direction),
  );
}
