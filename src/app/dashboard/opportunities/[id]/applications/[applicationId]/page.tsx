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
import { findPlacementByApplicationId } from "@/domains/recruitment/placements/placement.repository";
import { PLACEMENT_TRACK_OPPORTUNITY_TYPES } from "@/domains/recruitment/placements/placement.service";
import { listDailyLogsForPlacement } from "@/domains/recruitment/daily-logs/daily-log.repository";
import { listMembers } from "@/domains/platform/memberships/membership.repository";
import { storageProvider } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplicationStatusBadge } from "@/components/applications/application-status-badge";
import { ApplicationReviewActions } from "@/components/applications/application-review-actions";
import { OfferPanel } from "@/components/applications/offer-panel";
import { InterviewsPanel } from "@/components/applications/interviews-panel";
import { NotesPanel } from "@/components/applications/notes-panel";
import { PlacementPanel } from "@/components/applications/placement-panel";
import { DailyLogsPanel } from "@/components/applications/daily-logs-panel";

export const metadata = { title: "Application" };

async function resolveDocumentUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
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

  const [
    stages,
    resumeUrl,
    academicTranscriptUrl,
    recommendationLetterUrl,
    offers,
    interviews,
    notes,
    members,
    placement,
  ] = await Promise.all([
    listStagesForPipeline(application.opportunity.pipelineId),
    resolveDocumentUrl(application.resumeStoragePath),
    resolveDocumentUrl(application.academicTranscriptStoragePath),
    resolveDocumentUrl(application.recommendationLetterStoragePath),
    listOffersForApplication(application.id),
    listInterviewsForApplication(application.id),
    listNotesForApplication(application.id),
    listMembers(membership.organizationId),
    findPlacementByApplicationId(application.id),
  ]);

  const canUpdate = can(membership, "application.update");
  const activeOffer = offers.find((offer) => offer.status === "SENT") ?? null;
  const pastOffers = offers.filter((offer) => offer.id !== activeOffer?.id);
  const orgMembers = members
    .filter((member) => member.status === "ACTIVE")
    .map((member) => ({ id: member.id, name: member.user.name }));
  const isPlacementTrack = PLACEMENT_TRACK_OPPORTUNITY_TYPES.includes(
    application.opportunity.opportunityType,
  );
  const dailyLogs = placement
    ? (await listDailyLogsForPlacement(placement.id)).map((log) => ({
        ...log,
        hoursWorked: log.hoursWorked.toString(),
      }))
    : [];
  const canReviewDailyLogs =
    can(membership, "daily_log.review") &&
    (placement?.supervisorMembershipId === membership.membershipId ||
      can(membership, "placement.manage"));

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

      {application.institution && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Education</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Field label="Institution" value={application.institution} />
              <Field label="Program" value={application.program ?? "—"} />
              <Field label="Level of study" value={application.levelOfStudy ?? "—"} />
              <Field label="Year of study" value={application.yearOfStudy?.toString() ?? "—"} />
            </div>
            <div className="flex flex-wrap gap-2">
              {academicTranscriptUrl && (
                <Button
                  nativeButton={false}
                  variant="outline"
                  render={<a href={academicTranscriptUrl} target="_blank" />}
                >
                  <DownloadIcon /> {application.academicTranscriptFilename}
                </Button>
              )}
              {recommendationLetterUrl && (
                <Button
                  nativeButton={false}
                  variant="outline"
                  render={<a href={recommendationLetterUrl} target="_blank" />}
                >
                  <DownloadIcon /> {application.recommendationLetterFilename}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <OfferPanel
        applicationId={application.id}
        opportunityId={id}
        activeOffer={activeOffer}
        pastOffers={pastOffers}
        canManage={canUpdate}
      />

      {(isPlacementTrack || placement) && (
        <PlacementPanel
          applicationId={application.id}
          opportunityId={id}
          placement={placement}
          orgMembers={orgMembers}
          canManage={can(membership, "placement.manage")}
        />
      )}

      {placement && (
        <DailyLogsPanel
          applicationId={application.id}
          opportunityId={id}
          logs={dailyLogs}
          canReview={canReviewDailyLogs}
        />
      )}

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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
