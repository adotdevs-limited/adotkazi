import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { getCurrentUser } from "@/domains/platform/tenancy/active-organization";
import { findOrganizationBySlug } from "@/domains/platform/organizations/organization.repository";
import { findPublicOpportunityBySlug } from "@/domains/recruitment/opportunities/opportunity.repository";
import { findApplicationForUserAndOpportunity } from "@/domains/recruitment/applications/application.repository";
import { findSavedOpportunityForUser } from "@/domains/recruitment/saved-opportunities/saved-opportunity.repository";
import { PLACEMENT_TRACK_OPPORTUNITY_TYPES } from "@/domains/recruitment/opportunities/opportunity.schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplyForm } from "@/components/careers/apply-form";
import { SaveOpportunityButton } from "@/components/careers/save-opportunity-button";

type PageProps = {
  params: Promise<{ orgSlug: string; opportunitySlug: string }>;
};

async function loadPublicOpportunity(orgSlug: string, opportunitySlug: string) {
  const organization = await findOrganizationBySlug(orgSlug);
  if (!organization || (organization.status !== "ACTIVE" && organization.status !== "TRIAL")) {
    return null;
  }
  const opportunity = await findPublicOpportunityBySlug(organization.id, opportunitySlug);
  if (!opportunity) return null;
  return { organization, opportunity };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { orgSlug, opportunitySlug } = await params;
  const result = await loadPublicOpportunity(orgSlug, opportunitySlug);
  if (!result) return {};
  return {
    title: `${result.opportunity.title} at ${result.organization.name}`,
    description: result.opportunity.description?.slice(0, 160),
  };
}

export default async function CareersOpportunityPage({ params }: PageProps) {
  const { orgSlug, opportunitySlug } = await params;
  const result = await loadPublicOpportunity(orgSlug, opportunitySlug);
  if (!result) {
    notFound();
  }
  const { organization, opportunity } = result;
  const currentPath = `/careers/${organization.slug}/${opportunity.slug}`;
  const deadlinePassed = Boolean(
    opportunity.applicationDeadline && opportunity.applicationDeadline < new Date(),
  );
  const user = await getCurrentUser();
  const existingApplication = user
    ? await findApplicationForUserAndOpportunity(user.id, opportunity.id)
    : null;
  const existingSave = user
    ? await findSavedOpportunityForUser(user.id, opportunity.id)
    : null;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-16">
      <Button
        nativeButton={false}
        variant="ghost"
        className="w-fit"
        render={<Link href={`/careers/${organization.slug}`} />}
      >
        <ArrowLeftIcon /> All opportunities at {organization.name}
      </Button>

      <div className="grid gap-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{opportunity.title}</h1>
          {user && (
            <SaveOpportunityButton
              organizationSlug={organization.slug}
              opportunitySlug={opportunity.slug}
              savedOpportunityId={existingSave?.id ?? null}
            />
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          {opportunity.department.name} · {opportunity.opportunityType.replaceAll("_", " ")} ·{" "}
          {opportunity.workplaceType.replaceAll("_", " ")}
          {opportunity.location ? ` · ${opportunity.location}` : ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Apply</CardTitle>
        </CardHeader>
        <CardContent>
          {deadlinePassed ? (
            <Button disabled className="w-fit">
              Applications closed
            </Button>
          ) : existingApplication ? (
            <div className="grid gap-2">
              <p className="text-sm font-medium">
                You applied on {existingApplication.appliedAt.toLocaleDateString()}.
              </p>
              <Link
                href="/applications"
                className="text-muted-foreground hover:text-foreground w-fit text-sm underline-offset-4 hover:underline"
              >
                View all your applications
              </Link>
            </div>
          ) : user ? (
            <ApplyForm
              organizationSlug={organization.slug}
              opportunitySlug={opportunity.slug}
              isPlacementTrack={PLACEMENT_TRACK_OPPORTUNITY_TYPES.includes(
                opportunity.opportunityType,
              )}
            />
          ) : (
            <div className="flex gap-2">
              <Button
                nativeButton={false}
                render={<Link href={`/sign-in?redirect=${encodeURIComponent(currentPath)}`} />}
              >
                Sign in to apply
              </Button>
              <Button
                nativeButton={false}
                variant="outline"
                render={<Link href={`/sign-up?redirect=${encodeURIComponent(currentPath)}`} />}
              >
                Create account to apply
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <Field label="Openings" value={String(opportunity.openings)} />
          <Field label="Experience level" value={opportunity.experienceLevel ?? "—"} />
          <Field
            label="Salary range"
            value={
              opportunity.salaryMin || opportunity.salaryMax
                ? `${opportunity.salaryMin ?? "?"} – ${opportunity.salaryMax ?? "?"} ${opportunity.currency ?? ""}`
                : "—"
            }
          />
          <Field
            label="Application deadline"
            value={
              opportunity.applicationDeadline
                ? opportunity.applicationDeadline.toLocaleDateString()
                : "—"
            }
          />
          <Field
            label="Skills"
            value={
              opportunity.skillRequirements.length > 0
                ? opportunity.skillRequirements.map((requirement) => requirement.skill.name).join(", ")
                : "—"
            }
          />
        </CardContent>
      </Card>

      {opportunity.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">About this role</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{opportunity.description}</CardContent>
        </Card>
      )}

      {opportunity.responsibilities && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Responsibilities</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">
            {opportunity.responsibilities}
          </CardContent>
        </Card>
      )}

      {opportunity.requirements && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Requirements</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{opportunity.requirements}</CardContent>
        </Card>
      )}

      {opportunity.benefits && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Benefits</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{opportunity.benefits}</CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
