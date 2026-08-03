import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon, DownloadIcon } from "lucide-react";

import {
  requireCurrentUser,
  requireActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import { can } from "@/domains/platform/authorization/policy";
import {
  getApplicationDetail,
  ApplicationNotFoundError,
} from "@/domains/recruitment/applications/application.service";
import { listStagesForPipeline } from "@/domains/recruitment/pipelines/pipeline.repository";
import { listOffersForApplication } from "@/domains/recruitment/offers/offer.repository";
import { listInterviewsForApplication } from "@/domains/recruitment/interviews/interview.repository";
import { listNotesForApplication } from "@/domains/recruitment/notes/note.repository";
import { listMembers } from "@/domains/platform/memberships/membership.repository";
import { storageProvider } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { ApplicationReviewActions } from "@/components/applications/application-review-actions";
import { OfferPanel } from "@/components/applications/offer-panel";
import { InterviewsPanel } from "@/components/applications/interviews-panel";
import { NotesPanel } from "@/components/applications/notes-panel";

export const metadata = { title: "Application" };

async function resolveResumeUrl(path: string): Promise<string | null> {
  try {
    return await storageProvider.getSignedUrl(path);
  } catch {
    return null;
  }
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string; applicationId: string }>;
}) {
  const { id, applicationId } = await params;
  const user = await requireCurrentUser();
  const membership = await requireActiveMembership(user.id);

  if (!can(membership, "application.view")) {
    redirect(`/dashboard/opportunities/${id}`);
  }

  let application: Awaited<ReturnType<typeof getApplicationDetail>>;
  try {
    application = await getApplicationDetail(membership, applicationId);
  } catch (error) {
    if (error instanceof ApplicationNotFoundError) {
      notFound();
    }
    throw error;
  }

  const [stages, resumeUrl, offers, interviews, notes, members] = await Promise.all([
    listStagesForPipeline(application.opportunity.pipelineId),
    resolveResumeUrl(application.resumeStoragePath),
    listOffersForApplication(application.id),
    listInterviewsForApplication(application.id),
    listNotesForApplication(application.id),
    listMembers(membership.organizationId),
  ]);

  const canUpdate = can(membership, "application.update");
  const activeOffer = offers.find((offer) => offer.status === "SENT") ?? null;
  const pastOffers = offers.filter((offer) => offer.id !== activeOffer?.id);
  const orgMembers = members
    .filter((member) => member.status === "ACTIVE")
    .map((member) => ({ id: member.id, name: member.user.name }));

  return (
    <div className="grid gap-6">
      <Button
        nativeButton={false}
        variant="ghost"
        className="w-fit"
        render={<Link href={`/dashboard/opportunities/${id}/applications`} />}
      >
        <ArrowLeftIcon /> All applicants
      </Button>

      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{application.candidate.user.name}</h1>
        <ApplicationStatusBadge status={application.status} />
      </div>
      <p className="text-muted-foreground -mt-4 text-sm">
        {application.candidate.user.email} · Applied {application.appliedAt.toLocaleDateString()}{" "}
        for {application.opportunity.title}
      </p>

      {canUpdate && (
        <ApplicationReviewActions
          applicationId={application.id}
          status={application.status}
          stages={stages}
          currentStageId={application.currentStageId}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Resume</CardTitle>
        </CardHeader>
        <CardContent>
          {resumeUrl ? (
            <Button nativeButton={false} variant="outline" render={<a href={resumeUrl} target="_blank" />}>
              <DownloadIcon /> {application.resumeFilename}
            </Button>
          ) : (
            <p className="text-muted-foreground text-sm">
              Resume download isn&apos;t available right now.
            </p>
          )}
        </CardContent>
      </Card>

      <OfferPanel
        applicationId={application.id}
        opportunityId={id}
        activeOffer={activeOffer}
        pastOffers={pastOffers}
        canManage={canUpdate}
      />

      <InterviewsPanel
        applicationId={application.id}
        opportunityId={id}
        interviews={interviews}
        orgMembers={orgMembers}
        canManage={can(membership, "interview.manage")}
        canGiveFeedback={can(membership, "interview.feedback")}
        currentMembershipId={membership.membershipId}
      />

      <NotesPanel applicationId={application.id} opportunityId={id} notes={notes} />

      {application.coverNote && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cover note</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{application.coverNote}</CardContent>
        </Card>
      )}
    </div>
  );
}
