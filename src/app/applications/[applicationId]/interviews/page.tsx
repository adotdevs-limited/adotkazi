import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { getCurrentUser } from "@/domains/platform/tenancy/active-organization";
import { getInterviewsForCandidate } from "@/domains/recruitment/interviews/interview.service";
import { ApplicationNotFoundError } from "@/domains/recruitment/applications/application.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InterviewStatusBadge } from "@/components/applications/interview-status-badge";

export const metadata = { title: "Your Interviews" };

export default async function CandidateInterviewsPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/sign-in?redirect=${encodeURIComponent(`/applications/${applicationId}/interviews`)}`);
  }

  let result: Awaited<ReturnType<typeof getInterviewsForCandidate>>;
  try {
    result = await getInterviewsForCandidate(user, applicationId);
  } catch (error) {
    if (error instanceof ApplicationNotFoundError) {
      notFound();
    }
    throw error;
  }

  const { application, interviews } = result;

  return (
    <div className="mx-auto grid w-full max-w-xl gap-6 px-4 py-16">
      <Link
        href="/applications"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm"
      >
        <ArrowLeftIcon className="size-4" /> My Applications
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{application.opportunity.title}</h1>
        <p className="text-muted-foreground text-sm">{application.opportunity.organization.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Interviews</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {interviews.length === 0 && (
            <p className="text-muted-foreground text-sm">No interviews scheduled yet.</p>
          )}
          {interviews.map((interview) => (
            <div key={interview.id} className="grid gap-1.5 border-b pb-4 last:border-b-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <InterviewStatusBadge status={interview.status} />
                <span className="text-sm font-medium">
                  {interview.interviewType.replaceAll("_", " ")}
                </span>
              </div>
              <p className="text-muted-foreground text-xs">
                {interview.scheduledStart.toLocaleString()} –{" "}
                {interview.scheduledEnd.toLocaleTimeString()}
              </p>
              {interview.meetingLink && (
                <p className="text-xs">
                  {interview.meetingProvider ? `${interview.meetingProvider}: ` : "Link: "}
                  <a
                    href={interview.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {interview.meetingLink}
                  </a>
                </p>
              )}
              {interview.location && (
                <p className="text-muted-foreground text-xs">Location: {interview.location}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
