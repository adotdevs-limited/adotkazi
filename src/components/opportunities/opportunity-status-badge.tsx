import type { OpportunityStatus } from "@/generated/prisma/client";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

const STATUS_VARIANT: Record<OpportunityStatus, VariantProps<typeof badgeVariants>["variant"]> = {
  DRAFT: "secondary",
  PENDING_REVIEW: "outline",
  SCHEDULED: "outline",
  PUBLISHED: "default",
  PAUSED: "secondary",
  CLOSED: "destructive",
  ARCHIVED: "destructive",
};

const STATUS_LABEL: Record<OpportunityStatus, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending review",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
  PAUSED: "Paused",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
};

export function OpportunityStatusBadge({ status }: { status: OpportunityStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
