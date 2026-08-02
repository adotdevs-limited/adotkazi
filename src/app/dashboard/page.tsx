import Link from "next/link";
import { BriefcaseIcon, ArrowRightIcon } from "lucide-react";

import {
  requireCurrentUser,
  requireActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import { listOpportunitiesForOrganization } from "@/domains/recruitment/opportunities/opportunity.repository";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const membership = await requireActiveMembership(user.id);

  const opportunities = await listOpportunitiesForOrganization(membership.organizationId);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{membership.organizationName}</h1>
        <p className="text-muted-foreground text-sm">
          Welcome back, {user.name.split(" ")[0]}. Here&apos;s what&apos;s happening.
        </p>
      </div>

      <Card>
        <CardHeader className="items-center text-center">
          <div className="bg-muted mb-2 flex size-12 items-center justify-center rounded-full">
            <BriefcaseIcon className="text-muted-foreground size-6" />
          </div>
          <CardTitle>
            {opportunities.length} {opportunities.length === 1 ? "opportunity" : "opportunities"}
          </CardTitle>
          <CardDescription>
            {opportunities.length === 0
              ? "Create your first job requisition to get started."
              : "Job requisitions across your organization."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button nativeButton={false} render={<Link href="/dashboard/opportunities" />}>
            View opportunities <ArrowRightIcon />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
