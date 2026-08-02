"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { OpportunityStatus } from "@/generated/prisma/client";
import {
  archiveOpportunityAction,
  closeOpportunityAction,
  pauseOpportunityAction,
  publishOpportunityAction,
  resumeOpportunityAction,
  submitOpportunityForReviewAction,
  type LifecycleActionState,
} from "@/domains/recruitment/opportunities/opportunity.actions";
import { Button } from "@/components/ui/button";

export function OpportunityLifecycleActions({
  opportunityId,
  status,
  canUpdate,
  canPublish,
  canArchive,
}: {
  opportunityId: string;
  status: OpportunityStatus;
  canUpdate: boolean;
  canPublish: boolean;
  canArchive: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function run(action: (id: string) => Promise<LifecycleActionState>) {
    startTransition(async () => {
      const result = await action(opportunityId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  const buttons: React.ReactNode[] = [];

  if (status === "DRAFT" && canUpdate) {
    buttons.push(
      <Button
        key="submit-for-review"
        variant="outline"
        disabled={isPending}
        onClick={() => run(submitOpportunityForReviewAction)}
      >
        Submit for review
      </Button>,
    );
  }

  if ((status === "DRAFT" || status === "PENDING_REVIEW" || status === "SCHEDULED") && canPublish) {
    buttons.push(
      <Button key="publish" disabled={isPending} onClick={() => run(publishOpportunityAction)}>
        Publish
      </Button>,
    );
  }

  if (status === "PUBLISHED" && canPublish) {
    buttons.push(
      <Button
        key="pause"
        variant="outline"
        disabled={isPending}
        onClick={() => run(pauseOpportunityAction)}
      >
        Pause
      </Button>,
    );
  }

  if (status === "PAUSED" && canPublish) {
    buttons.push(
      <Button key="resume" disabled={isPending} onClick={() => run(resumeOpportunityAction)}>
        Resume
      </Button>,
    );
  }

  if ((status === "PUBLISHED" || status === "PAUSED") && canArchive) {
    buttons.push(
      <Button
        key="close"
        variant="outline"
        disabled={isPending}
        onClick={() => run(closeOpportunityAction)}
      >
        Close
      </Button>,
    );
  }

  if (status !== "ARCHIVED" && canArchive) {
    buttons.push(
      <Button
        key="archive"
        variant="destructive"
        disabled={isPending}
        onClick={() => run(archiveOpportunityAction)}
      >
        Archive
      </Button>,
    );
  }

  if (buttons.length === 0) return null;

  return <div className="flex flex-wrap gap-2">{buttons}</div>;
}
