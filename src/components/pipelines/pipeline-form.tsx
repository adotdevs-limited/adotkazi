"use client";

import { useActionState } from "react";

import {
  createPipelineAction,
  updatePipelineAction,
  type PipelineActionState,
} from "@/domains/recruitment/pipelines/pipeline.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TEXTAREA_CLASS =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-20 w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:ring-3";

export type PipelineFormDefaultValues = {
  id: string;
  name: string;
  description: string;
};

export function PipelineForm({
  mode,
  defaultValues,
}: {
  mode: "create" | "edit";
  defaultValues?: Partial<PipelineFormDefaultValues>;
}) {
  const initialState: PipelineActionState = { error: null };
  const [state, formAction, isPending] = useActionState(
    mode === "create" ? createPipelineAction : updatePipelineAction,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "create" ? "New pipeline" : "Edit pipeline"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          {mode === "edit" && <input type="hidden" name="id" value={defaultValues?.id} />}

          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={defaultValues?.name}
              placeholder="Engineering Pipeline"
            />
            {state.fieldErrors?.name && (
              <p className="text-destructive text-sm">{state.fieldErrors.name}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              className={TEXTAREA_CLASS}
              defaultValue={defaultValues?.description}
              placeholder="What this pipeline is for and when to use it."
            />
            {state.fieldErrors?.description && (
              <p className="text-destructive text-sm">{state.fieldErrors.description}</p>
            )}
          </div>

          {state.error && <p className="text-destructive text-sm">{state.error}</p>}

          <div>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : mode === "create" ? "Create pipeline" : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
