import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BriefcaseIcon } from "lucide-react";

import { findOrganizationBySlug } from "@/domains/platform/organizations/organization.repository";
import { listPublicOpportunitiesForOrganization } from "@/domains/recruitment/opportunities/opportunity.repository";
import {
  OPPORTUNITY_TYPE_OPTIONS,
  WORKPLACE_TYPE_OPTIONS,
} from "@/domains/recruitment/opportunities/opportunity.schema";
import type { OpportunityType, WorkplaceType } from "@/generated/prisma/client";
import { OpportunityCard } from "@/components/careers/opportunity-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SELECT_CLASS =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3";

type PageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ type?: string; workplace?: string; q?: string }>;
};

async function loadActiveOrganization(orgSlug: string) {
  const organization = await findOrganizationBySlug(orgSlug);
  if (!organization || (organization.status !== "ACTIVE" && organization.status !== "TRIAL")) {
    return null;
  }
  return organization;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { orgSlug } = await params;
  const organization = await loadActiveOrganization(orgSlug);
  if (!organization) return {};
  return {
    title: `Careers at ${organization.name}`,
    description: `Open opportunities at ${organization.name}.`,
  };
}

export default async function CareersPage({ params, searchParams }: PageProps) {
  const { orgSlug } = await params;
  const { type, workplace, q } = await searchParams;

  const organization = await loadActiveOrganization(orgSlug);
  if (!organization) {
    notFound();
  }

  const opportunityType = OPPORTUNITY_TYPE_OPTIONS.includes(type as OpportunityType)
    ? (type as OpportunityType)
    : undefined;
  const workplaceType = WORKPLACE_TYPE_OPTIONS.includes(workplace as WorkplaceType)
    ? (workplace as WorkplaceType)
    : undefined;

  const opportunities = await listPublicOpportunitiesForOrganization(organization.id, {
    opportunityType,
    workplaceType,
    q: q?.trim() || undefined,
  });

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-16">
      <div className="grid gap-3 text-center">
        <span className="bg-primary text-primary-foreground mx-auto flex size-12 items-center justify-center rounded-2xl text-xl font-bold">
          {organization.name.charAt(0).toUpperCase()}
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Careers at {organization.name}</h1>
        <p className="text-muted-foreground text-sm">
          {opportunities.length} open {opportunities.length === 1 ? "opportunity" : "opportunities"}
        </p>
      </div>

      <form className="flex flex-wrap gap-2" method="get">
        <Input
          name="q"
          placeholder="Search opportunities"
          defaultValue={q ?? ""}
          className="min-w-48 flex-1"
        />
        <select name="type" defaultValue={type ?? ""} className={SELECT_CLASS}>
          <option value="">All types</option>
          {OPPORTUNITY_TYPE_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <select name="workplace" defaultValue={workplace ?? ""} className={SELECT_CLASS}>
          <option value="">All workplaces</option>
          {WORKPLACE_TYPE_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <div className="grid gap-3">
        {opportunities.length === 0 && (
          <div className="text-muted-foreground flex flex-col items-center gap-2 py-16 text-center text-sm">
            <BriefcaseIcon className="size-6" />
            No open opportunities match your filters right now.
          </div>
        )}
        {opportunities.map((opportunity) => (
          <OpportunityCard
            key={opportunity.id}
            organizationSlug={organization.slug}
            opportunity={opportunity}
          />
        ))}
      </div>
    </div>
  );
}
