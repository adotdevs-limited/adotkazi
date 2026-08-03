import type { DailyLogStatus } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT: Record<DailyLogStatus, "default" | "secondary" | "destructive"> = {
  SUBMITTED: "secondary",
  APPROVED: "default",
  RETURNED: "destructive",
};

export function DailyLogStatusBadge({ status }: { status: DailyLogStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>;
}
