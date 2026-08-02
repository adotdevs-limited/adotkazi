"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

import {
  createPipelineStageAction,
  deletePipelineStageAction,
  movePipelineStageAction,
  updatePipelineStageAction,
  type PipelineActionState,
  type PipelineLifecycleState,
} from "@/domains/recruitment/pipelines/pipeline.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type PipelineStageRow = {
  id: string;
  name: string;
  order: number;
  color: string | null;
  isTerminal: boolean;
  allowsFeedback: boolean;
  applicationCount: number;
};

function StageForm({
  pipelineId,
  stage,
  onDone,
}: {
  pipelineId: string;
  stage?: PipelineStageRow;
  onDone?: () => void;
}) {
  const initialState: PipelineActionState = { error: null };
  const [state, formAction, isPending] = useActionState(
    stage ? updatePipelineStageAction : createPipelineStageAction,
    initialState,
  );
  const formRef = React.useRef<HTMLFormElement>(null);
  const onDoneRef = React.useRef(onDone);

  React.useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  React.useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      onDoneRef.current?.();
    }
  }, [state.success]);

  const domId = stage?.id ?? "new";

  return (
    <form ref={formRef} action={formAction} className="grid gap-3 rounded-lg border p-3">
      <input type="hidden" name="pipelineId" value={pipelineId} />
      {stage && <input type="hidden" name="stageId" value={stage.id} />}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="grid gap-2">
          <Label htmlFor={`name-${domId}`}>Name</Label>
          <Input
            id={`name-${domId}`}
            name="name"
            required
            defaultValue={stage?.name}
            placeholder="Technical Interview"
          />
          {state.fieldErrors?.name && (
            <p className="text-destructive text-sm">{state.fieldErrors.name}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`color-${domId}`}>Color</Label>
          <input
            id={`color-${domId}`}
            name="color"
            type="color"
            defaultValue={stage?.color ?? "#6366f1"}
            className="h-8 w-16 rounded-lg border p-1"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isTerminal" defaultChecked={stage?.isTerminal ?? false} />
          Terminal stage
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="allowsFeedback"
            defaultChecked={stage?.allowsFeedback ?? true}
          />
          Allows feedback
        </label>
      </div>

      {state.error && <p className="text-destructive text-sm">{state.error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : stage ? "Save stage" : "Add stage"}
        </Button>
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function StageRow({
  pipelineId,
  stage,
  isFirst,
  isLast,
}: {
  pipelineId: string;
  stage: PipelineStageRow;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  function run(action: () => Promise<PipelineLifecycleState>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (isEditing) {
    return (
      <StageForm pipelineId={pipelineId} stage={stage} onDone={() => setIsEditing(false)} />
    );
  }

  const deleteBlockedReason =
    stage.applicationCount > 0
      ? `${stage.applicationCount} application(s) are currently in this stage.`
      : undefined;

  return (
    <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
      <span
        className="size-3 shrink-0 rounded-full border"
        style={{ backgroundColor: stage.color ?? "transparent" }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{stage.name}</p>
        <p className="text-muted-foreground truncate text-xs">
          {stage.applicationCount} {stage.applicationCount === 1 ? "application" : "applications"}
        </p>
      </div>
      {stage.isTerminal && <Badge variant="secondary">Terminal</Badge>}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          disabled={isPending || isFirst}
          onClick={() => run(() => movePipelineStageAction(pipelineId, stage.id, "up"))}
        >
          <ArrowUpIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={isPending || isLast}
          onClick={() => run(() => movePipelineStageAction(pipelineId, stage.id, "down"))}
        >
          <ArrowDownIcon />
        </Button>
        <Button variant="ghost" size="icon" disabled={isPending} onClick={() => setIsEditing(true)}>
          <PencilIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={isPending || Boolean(deleteBlockedReason)}
          title={deleteBlockedReason}
          onClick={() => {
            if (!window.confirm(`Delete the "${stage.name}" stage?`)) return;
            run(() => deletePipelineStageAction(pipelineId, stage.id));
          }}
        >
          <Trash2Icon />
        </Button>
      </div>
    </div>
  );
}

export function PipelineStageManager({
  pipelineId,
  stages,
}: {
  pipelineId: string;
  stages: PipelineStageRow[];
}) {
  const [showAddForm, setShowAddForm] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          {stages.length} {stages.length === 1 ? "stage" : "stages"}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {stages.map((stage, index) => (
          <StageRow
            key={stage.id}
            pipelineId={pipelineId}
            stage={stage}
            isFirst={index === 0}
            isLast={index === stages.length - 1}
          />
        ))}

        {showAddForm ? (
          <StageForm pipelineId={pipelineId} onDone={() => setShowAddForm(false)} />
        ) : (
          <Button variant="outline" className="w-fit" onClick={() => setShowAddForm(true)}>
            <PlusIcon /> Add stage
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
