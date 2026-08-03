import type { InterviewStatus } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANT: Record<InterviewStatus, "default" | "secondary" | "destructive"> = {
  SCHEDULED: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

export function InterviewStatusBadge({ status }: { status: InterviewStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>;
}
