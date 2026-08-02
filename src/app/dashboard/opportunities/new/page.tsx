import { redirect } from "next/navigation";

import {
  requireCurrentUser,
  requireActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import { can } from "@/domains/platform/authorization/policy";
import { prisma } from "@/lib/db";
import { listPipelinesForOrganization } from "@/domains/recruitment/pipelines/pipeline.repository";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";

export const metadata = { title: "New opportunity" };

export default async function NewOpportunityPage() {
  const user = await requireCurrentUser();
  const membership = await requireActiveMembership(user.id);

  if (!can(membership, "opportunity.create")) {
    redirect("/dashboard/opportunities");
  }

  const [departments, branches, pipelines] = await Promise.all([
    prisma.department.findMany({
      where: { organizationId: membership.organizationId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.branch.findMany({
      where: { organizationId: membership.organizationId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    listPipelinesForOrganization(membership.organizationId),
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New opportunity</h1>
        <p className="text-muted-foreground text-sm">Create a new job requisition.</p>
      </div>
      <OpportunityForm
        mode="create"
        departments={departments}
        branches={branches}
        pipelines={pipelines}
      />
    </div>
  );
}
