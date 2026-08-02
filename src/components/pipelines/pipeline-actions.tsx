"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  deletePipelineAction,
  setDefaultPipelineAction,
  type PipelineLifecycleState,
} from "@/domains/recruitment/pipelines/pipeline.actions";
import { Button } from "@/components/ui/button";

export function PipelineActions({
  pipelineId,
  isDefault,
  isSystem,
  opportunityCount,
}: {
  pipelineId: string;
  isDefault: boolean;
  isSystem: boolean;
  opportunityCount: number;
}) {
  const router = useRouter();
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

  const deleteBlockedReason = isSystem
    ? "The default seeded pipeline can't be deleted."
    : isDefault
      ? "Set a different pipeline as default before deleting this one."
      : opportunityCount > 0
        ? "This pipeline is used by one or more opportunities."
        : undefined;

  return (
    <div className="flex items-center gap-2">
      {!isDefault && (
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => run(() => setDefaultPipelineAction(pipelineId))}
        >
          Set as default
        </Button>
      )}
      <Button
        variant="destructive"
        disabled={isPending || Boolean(deleteBlockedReason)}
        title={deleteBlockedReason}
        onClick={() => {
          if (!window.confirm("Delete this pipeline? This can't be undone.")) return;
          run(() => deletePipelineAction(pipelineId));
        }}
      >
        Delete pipeline
      </Button>
    </div>
  );
}
