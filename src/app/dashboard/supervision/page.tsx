import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCapIcon } from "lucide-react";

import {
  requireCurrentUser,
  requireActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import { can } from "@/domains/platform/authorization/policy";
import { getSupervisedPlacements } from "@/domains/recruitment/placements/placement.service";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlacementStatusBadge } from "@/components/applications/placement-status-badge";

export const metadata = { title: "My Supervision" };

export default async function SupervisionPage() {
  const user = await requireCurrentUser();
  const membership = await requireActiveMembership(user.id);

  if (!can(membership, "placement.view")) {
    redirect("/dashboard");
  }

  const placements = await getSupervisedPlacements(membership);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Supervision</h1>
        <p className="text-muted-foreground text-sm">
          Placements assigned to you at {membership.organizationName}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {placements.length} {placements.length === 1 ? "student" : "students"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1">
          {placements.length === 0 && (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm">
              <GraduationCapIcon className="size-6" />
              No placements assigned to you yet.
            </div>
          )}
          {placements.map((placement) => {
            const pendingLogCount = placement.dailyLogs.filter(
              (log) => log.status === "SUBMITTED",
            ).length;
            return (
              <Link
                key={placement.id}
                href={`/dashboard/supervision/${placement.id}`}
                className="hover:bg-muted/50 flex items-center gap-3 rounded-lg px-2 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {placement.application.candidate.user.name}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {placement.application.opportunity.title}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {pendingLogCount > 0 && (
                    <Badge variant="secondary">
                      {pendingLogCount} log{pendingLogCount === 1 ? "" : "s"} to review
                    </Badge>
                  )}
                  <PlacementStatusBadge status={placement.status} />
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
