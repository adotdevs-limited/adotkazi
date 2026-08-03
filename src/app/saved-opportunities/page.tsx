import Link from "next/link";
import { redirect } from "next/navigation";
import { BookmarkIcon } from "lucide-react";

import { getCurrentUser } from "@/domains/platform/tenancy/active-organization";
import { listSavedOpportunitiesForCandidate } from "@/domains/recruitment/saved-opportunities/saved-opportunity.repository";
import { Card, CardContent } from "@/components/ui/card";
import { SaveOpportunityButton } from "@/components/careers/save-opportunity-button";

export const metadata = { title: "Saved Opportunities" };

export default async function SavedOpportunitiesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/sign-in?redirect=${encodeURIComponent("/saved-opportunities")}`);
  }

  const savedOpportunities = await listSavedOpportunitiesForCandidate(user.id);

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-16">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Saved Opportunities</h1>
          <p className="text-muted-foreground text-sm">
            {savedOpportunities.length}{" "}
            {savedOpportunities.length === 1 ? "opportunity" : "opportunities"} saved
          </p>
        </div>
        <Link
          href="/applications"
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          My Applications
        </Link>
      </div>

      <Card>
        <CardContent className="grid gap-1">
          {savedOpportunities.length === 0 && (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm">
              <BookmarkIcon className="size-6" />
              You haven&apos;t saved any opportunities yet.
            </div>
          )}
          {savedOpportunities.map((saved) => (
            <div
              key={saved.id}
              className="hover:bg-muted/50 flex items-center gap-3 rounded-lg px-2 py-2"
            >
              <Link
                href={`/careers/${saved.opportunity.organization.slug}/${saved.opportunity.slug}`}
                className="min-w-0 flex-1"
              >
                <p className="truncate text-sm font-medium">{saved.opportunity.title}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {saved.opportunity.organization.name}
                </p>
              </Link>
              <span className="text-muted-foreground text-xs">
                {saved.opportunity.opportunityType.replaceAll("_", " ")}
              </span>
              {saved.opportunity.status !== "PUBLISHED" && (
                <span className="text-muted-foreground text-xs">No longer accepting applications</span>
              )}
              <SaveOpportunityButton
                savedOpportunityId={saved.id}
                organizationSlug={saved.opportunity.organization.slug}
                opportunitySlug={saved.opportunity.slug}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
