import type { PlacementStatus } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT: Record<PlacementStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  APPROVED: "secondary",
  ACTIVE: "default",
  SUSPENDED: "destructive",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

export function PlacementStatusBadge({ status }: { status: PlacementStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>;
}
