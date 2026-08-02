import { notFound, redirect } from "next/navigation";

import {
  requireCurrentUser,
  requireActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import { can } from "@/domains/platform/authorization/policy";
import { findOpportunityById } from "@/domains/recruitment/opportunities/opportunity.repository";
import { listDepartmentsForOrganization } from "@/domains/platform/departments/department.repository";
import { listBranchesForOrganization } from "@/domains/platform/branches/branch.repository";
import { listPipelinesForOrganization } from "@/domains/recruitment/pipelines/pipeline.repository";
import { OpportunityForm } from "@/components/opportunities/opportunity-form";

export const metadata = { title: "Edit opportunity" };

export default async function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireCurrentUser();
  const membership = await requireActiveMembership(user.id);

  if (!can(membership, "opportunity.update")) {
    redirect(`/dashboard/opportunities/${id}`);
  }

  const opportunity = await findOpportunityById(id, membership.organizationId);
  if (!opportunity) {
    notFound();
  }
  if (opportunity.status === "CLOSED" || opportunity.status === "ARCHIVED") {
    redirect(`/dashboard/opportunities/${id}`);
  }

  const [departments, branches, pipelines] = await Promise.all([
    listDepartmentsForOrganization(membership.organizationId),
    listBranchesForOrganization(membership.organizationId),
    listPipelinesForOrganization(membership.organizationId),
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit opportunity</h1>
        <p className="text-muted-foreground text-sm">{opportunity.title}</p>
      </div>
      <OpportunityForm
        mode="edit"
        departments={departments}
        branches={branches}
        pipelines={pipelines}
        defaultValues={{
          id: opportunity.id,
          title: opportunity.title,
          slug: opportunity.slug,
          departmentId: opportunity.departmentId,
          branchId: opportunity.branchId ?? "",
          pipelineId: opportunity.pipelineId,
          opportunityType: opportunity.opportunityType,
          workplaceType: opportunity.workplaceType,
          experienceLevel: opportunity.experienceLevel ?? "",
          location: opportunity.location ?? "",
          openings: opportunity.openings,
          salaryMin: opportunity.salaryMin?.toString() ?? "",
          salaryMax: opportunity.salaryMax?.toString() ?? "",
          currency: opportunity.currency ?? "",
          applicationDeadline: opportunity.applicationDeadline
            ? opportunity.applicationDeadline.toISOString().slice(0, 10)
            : "",
          description: opportunity.description ?? "",
          responsibilities: opportunity.responsibilities ?? "",
          requirements: opportunity.requirements ?? "",
          benefits: opportunity.benefits ?? "",
          visibility: opportunity.visibility,
          skills: opportunity.skillRequirements
            .map((requirement) => requirement.skill.name)
            .join(", "),
        }}
      />
    </div>
  );
}
