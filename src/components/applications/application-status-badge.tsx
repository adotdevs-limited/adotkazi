import type { ApplicationStatus } from "@/generated/prisma/client";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

const STATUS_VARIANT: Record<ApplicationStatus, VariantProps<typeof badgeVariants>["variant"]> = {
  ACTIVE: "default",
  REJECTED: "destructive",
  HIRED: "secondary",
};

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  ACTIVE: "Active",
  REJECTED: "Rejected",
  HIRED: "Hired",
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
