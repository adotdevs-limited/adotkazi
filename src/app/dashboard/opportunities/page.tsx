import Link from "next/link";
import { BriefcaseIcon, ExternalLinkIcon, PlusIcon } from "lucide-react";

import {
  requireCurrentUser,
  requireActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import { can } from "@/domains/platform/authorization/policy";
import { listOpportunitiesForOrganization } from "@/domains/recruitment/opportunities/opportunity.repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OpportunityStatusBadge } from "@/components/opportunities/opportunity-status-badge";

export const metadata = { title: "Opportunities" };

export default async function OpportunitiesPage() {
  const user = await requireCurrentUser();
  const membership = await requireActiveMembership(user.id);

  const opportunities = await listOpportunitiesForOrganization(membership.organizationId);
  const canCreate = can(membership, "opportunity.create");

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Opportunities</h1>
          <p className="text-muted-foreground text-sm">
            Job requisitions for {membership.organizationName}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`/careers/${membership.organizationSlug}`} target="_blank" />}
          >
            <ExternalLinkIcon /> View careers page
          </Button>
          {canCreate && (
            <Button nativeButton={false} render={<Link href="/dashboard/opportunities/new" />}>
              <PlusIcon /> New opportunity
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            {opportunities.length} {opportunities.length === 1 ? "opportunity" : "opportunities"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1">
          {opportunities.length === 0 && (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm">
              <BriefcaseIcon className="size-6" />
              No opportunities yet.
            </div>
          )}
          {opportunities.map((opportunity) => (
            <Link
              key={opportunity.id}
              href={`/dashboard/opportunities/${opportunity.id}`}
              className="hover:bg-muted/50 flex items-center gap-3 rounded-lg px-2 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{opportunity.title}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {opportunity.department.name} · {opportunity.opportunityType.replaceAll("_", " ")}{" "}
                  · {opportunity.openings} {opportunity.openings === 1 ? "opening" : "openings"}
                </p>
              </div>
              <span className="text-muted-foreground text-xs">
                {opportunity.createdAt.toLocaleDateString()}
              </span>
              <OpportunityStatusBadge status={opportunity.status} />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
