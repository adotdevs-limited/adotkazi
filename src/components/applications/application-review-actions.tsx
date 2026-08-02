"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { ApplicationStatus } from "@/generated/prisma/client";
import {
  moveApplicationStageAction,
  rejectApplicationAction,
  reactivateApplicationAction,
  type ApplicationLifecycleState,
} from "@/domains/recruitment/applications/application.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const SELECT_CLASS =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3";

export function ApplicationReviewActions({
  applicationId,
  status,
  stages,
  currentStageId,
}: {
  applicationId: string;
  status: ApplicationStatus;
  stages: Array<{ id: string; name: string }>;
  currentStageId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function run(action: () => Promise<ApplicationLifecycleState>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="grid gap-2">
        <Label htmlFor="stage">Stage</Label>
        <select
          id="stage"
          className={SELECT_CLASS}
          disabled={isPending}
          defaultValue={currentStageId ?? ""}
          onChange={(event) =>
            run(() => moveApplicationStageAction(applicationId, event.target.value))
          }
        >
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </select>
      </div>

      {status === "ACTIVE" ? (
        <Button
          variant="destructive"
          disabled={isPending}
          onClick={() => run(() => rejectApplicationAction(applicationId))}
        >
          Reject
        </Button>
      ) : (
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => run(() => reactivateApplicationAction(applicationId))}
        >
          Reactivate
        </Button>
      )}
    </div>
  );
}
