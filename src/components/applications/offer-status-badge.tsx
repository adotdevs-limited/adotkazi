import type { OfferStatus } from "@/generated/prisma/client";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

const STATUS_VARIANT: Record<OfferStatus, VariantProps<typeof badgeVariants>["variant"]> = {
  SENT: "secondary",
  ACCEPTED: "default",
  DECLINED: "destructive",
  WITHDRAWN: "outline",
  EXPIRED: "outline",
};

const STATUS_LABEL: Record<OfferStatus, string> = {
  SENT: "Sent",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  WITHDRAWN: "Withdrawn",
  EXPIRED: "Expired",
};

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
