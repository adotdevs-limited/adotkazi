import Link from "next/link";
import { redirect } from "next/navigation";
import { BriefcaseIcon } from "lucide-react";

import { getCurrentUser } from "@/domains/platform/tenancy/active-organization";
import { listApplicationsForCandidate } from "@/domains/recruitment/applications/application.repository";
import { Card, CardContent } from "@/components/ui/card";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";

export const metadata = { title: "My Applications" };

export default async function MyApplicationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/sign-in?redirect=${encodeURIComponent("/applications")}`);
  }

  const applications = await listApplicationsForCandidate(user.id);

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-16">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Applications</h1>
          <p className="text-muted-foreground text-sm">
            {applications.length} {applications.length === 1 ? "application" : "applications"}
          </p>
        </div>
        <Link
          href="/saved-opportunities"
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          Saved Opportunities
        </Link>
      </div>

      <Card>
        <CardContent className="grid gap-1">
          {applications.length === 0 && (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm">
              <BriefcaseIcon className="size-6" />
              You haven&apos;t applied to any opportunities yet.
            </div>
          )}
          {applications.map((application) => (
            <div
              key={application.id}
              className="hover:bg-muted/50 flex items-center gap-3 rounded-lg px-2 py-2"
            >
              <Link
                href={`/careers/${application.opportunity.organization.slug}/${application.opportunity.slug}`}
                className="min-w-0 flex-1"
              >
                <p className="truncate text-sm font-medium">{application.opportunity.title}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {application.opportunity.organization.name}
                </p>
              </Link>
              <span className="text-muted-foreground text-xs">
                {application.currentStage?.name ?? "—"}
              </span>
              <span className="text-muted-foreground text-xs">
                {application.appliedAt.toLocaleDateString()}
              </span>
              {application.interviews.length > 0 && (
                <span className="text-muted-foreground text-xs">
                  Interview: {application.interviews[0]!.scheduledStart.toLocaleString()}
                </span>
              )}
              {application._count.interviews > 0 && (
                <Link
                  href={`/applications/${application.id}/interviews`}
                  className="text-primary text-xs font-medium underline-offset-4 hover:underline"
                >
                  View interviews
                </Link>
              )}
              {application.placement && (
                <Link
                  href={`/applications/${application.id}/daily-logs`}
                  className="text-primary text-xs font-medium underline-offset-4 hover:underline"
                >
                  Daily logs
                </Link>
              )}
              {application.offers.length > 0 && (
                <Link
                  href={`/applications/${application.id}/offer`}
                  className="text-primary text-xs font-medium underline-offset-4 hover:underline"
                >
                  View offer
                </Link>
              )}
              <ApplicationStatusBadge status={application.status} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
