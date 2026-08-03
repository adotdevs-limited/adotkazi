"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { InterviewRecommendation, InterviewStatus } from "@/generated/prisma/client";
import {
  INTERVIEW_RECOMMENDATION_OPTIONS,
  INTERVIEW_TYPE_OPTIONS,
} from "@/domains/recruitment/interviews/interview.schema";
import {
  scheduleInterviewAction,
  cancelInterviewAction,
  completeInterviewAction,
  submitFeedbackAction,
  type InterviewActionState,
} from "@/domains/recruitment/interviews/interview.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SELECT_CLASS =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3";
const TEXTAREA_CLASS =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-20 w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:ring-3";

const STATUS_VARIANT: Record<InterviewStatus, "default" | "secondary" | "destructive"> = {
  SCHEDULED: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

const RECOMMENDATION_LABEL: Record<InterviewRecommendation, string> = {
  STRONG_YES: "Strong yes",
  YES: "Yes",
  NO: "No",
  STRONG_NO: "Strong no",
};

export type InterviewWithRelations = {
  id: string;
  interviewType: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  meetingProvider: string | null;
  meetingLink: string | null;
  location: string | null;
  status: InterviewStatus;
  interviewers: Array<{ membershipId: string; membership: { user: { name: string } } }>;
  feedback: Array<{
    id: string;
    membershipId: string;
    recommendation: InterviewRecommendation;
    comments: string | null;
    membership: { user: { name: string } };
  }>;
};

export function InterviewsPanel({
  applicationId,
  opportunityId,
  interviews,
  orgMembers,
  canManage,
  canGiveFeedback,
  currentMembershipId,
}: {
  applicationId: string;
  opportunityId: string;
  interviews: InterviewWithRelations[];
  orgMembers: Array<{ id: string; name: string }>;
  canManage: boolean;
  canGiveFeedback: boolean;
  currentMembershipId: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Interviews</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {interviews.length === 0 && (
          <p className="text-muted-foreground text-sm">No interviews scheduled yet.</p>
        )}

        {interviews.map((interview) => (
          <InterviewRow
            key={interview.id}
            interview={interview}
            opportunityId={opportunityId}
            applicationId={applicationId}
            canManage={canManage}
            canGiveFeedback={canGiveFeedback}
            currentMembershipId={currentMembershipId}
          />
        ))}

        {canManage && (
          <ScheduleInterviewForm
            opportunityId={opportunityId}
            applicationId={applicationId}
            orgMembers={orgMembers}
          />
        )}
      </CardContent>
    </Card>
  );
}

function InterviewRow({
  interview,
  opportunityId,
  applicationId,
  canManage,
  canGiveFeedback,
  currentMembershipId,
}: {
  interview: InterviewWithRelations;
  opportunityId: string;
  applicationId: string;
  canManage: boolean;
  canGiveFeedback: boolean;
  currentMembershipId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function run(action: () => Promise<InterviewActionState>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  const isAssignedToMe = interview.interviewers.some(
    (participant) => participant.membershipId === currentMembershipId,
  );
  const hasSubmittedFeedback = interview.feedback.some(
    (feedback) => feedback.membershipId === currentMembershipId,
  );

  return (
    <div className="grid gap-2 border-b pb-4 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={STATUS_VARIANT[interview.status]}>{interview.status}</Badge>
        <span className="text-sm font-medium">{interview.interviewType.replaceAll("_", " ")}</span>
        <span className="text-muted-foreground text-xs">
          {interview.scheduledStart.toLocaleString()} – {interview.scheduledEnd.toLocaleTimeString()}
        </span>
      </div>
      <p className="text-muted-foreground text-xs">
        Interviewers: {interview.interviewers.map((p) => p.membership.user.name).join(", ")}
      </p>
      {(interview.meetingLink || interview.location) && (
        <p className="text-muted-foreground text-xs">
          {interview.meetingLink ? `Link: ${interview.meetingLink}` : `Location: ${interview.location}`}
        </p>
      )}

      {canManage && interview.status === "SCHEDULED" && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() =>
              run(() => completeInterviewAction(opportunityId, applicationId, interview.id))
            }
          >
            Mark completed
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={isPending}
            onClick={() => run(() => cancelInterviewAction(opportunityId, applicationId, interview.id))}
          >
            Cancel
          </Button>
        </div>
      )}

      {interview.feedback.length > 0 && (
        <div className="grid gap-1 pl-2 text-sm">
          {interview.feedback.map((feedback) => (
            <p key={feedback.id} className="text-muted-foreground text-xs">
              <span className="text-foreground font-medium">{feedback.membership.user.name}</span>:{" "}
              {RECOMMENDATION_LABEL[feedback.recommendation]}
              {feedback.comments ? ` — ${feedback.comments}` : ""}
            </p>
          ))}
        </div>
      )}

      {canGiveFeedback && isAssignedToMe && !hasSubmittedFeedback && interview.status !== "CANCELLED" && (
        <FeedbackForm
          opportunityId={opportunityId}
          applicationId={applicationId}
          interviewId={interview.id}
        />
      )}
    </div>
  );
}

function FeedbackForm({
  opportunityId,
  applicationId,
  interviewId,
}: {
  opportunityId: string;
  applicationId: string;
  interviewId: string;
}) {
  const initialState: InterviewActionState = { error: null };
  const [state, formAction, isPending] = useActionState(
    submitFeedbackAction.bind(null, opportunityId, applicationId, interviewId),
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-2 pl-2">
      <div className="grid gap-1.5">
        <Label htmlFor={`recommendation-${interviewId}`}>Your feedback</Label>
        <select id={`recommendation-${interviewId}`} name="recommendation" className={SELECT_CLASS}>
          {INTERVIEW_RECOMMENDATION_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {RECOMMENDATION_LABEL[value]}
            </option>
          ))}
        </select>
      </div>
      <textarea
        name="comments"
        placeholder="Comments (optional)"
        className={TEXTAREA_CLASS}
      />
      {state.error && <p className="text-destructive text-xs">{state.error}</p>}
      <Button type="submit" size="sm" disabled={isPending} className="w-fit">
        {isPending ? "Submitting…" : "Submit feedback"}
      </Button>
    </form>
  );
}

function ScheduleInterviewForm({
  opportunityId,
  applicationId,
  orgMembers,
}: {
  opportunityId: string;
  applicationId: string;
  orgMembers: Array<{ id: string; name: string }>;
}) {
  const initialState: InterviewActionState = { error: null };
  const [state, formAction, isPending] = useActionState(
    scheduleInterviewAction.bind(null, opportunityId, applicationId),
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-3 border-t pt-4">
      <p className="text-sm font-medium">Schedule interview</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="interviewType">Type</Label>
          <select id="interviewType" name="interviewType" className={SELECT_CLASS}>
            {INTERVIEW_TYPE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div />
        <div className="grid gap-1.5">
          <Label htmlFor="scheduledStart">Start</Label>
          <Input id="scheduledStart" name="scheduledStart" type="datetime-local" required />
          {state.fieldErrors?.scheduledStart && (
            <p className="text-destructive text-xs">{state.fieldErrors.scheduledStart}</p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="scheduledEnd">End</Label>
          <Input id="scheduledEnd" name="scheduledEnd" type="datetime-local" required />
          {state.fieldErrors?.scheduledEnd && (
            <p className="text-destructive text-xs">{state.fieldErrors.scheduledEnd}</p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="meetingLink">Meeting link</Label>
          <Input id="meetingLink" name="meetingLink" placeholder="https://…" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" placeholder="Office address" />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label>Interviewers</Label>
        <div className="grid gap-1">
          {orgMembers.map((member) => (
            <label key={member.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="interviewerMembershipIds" value={member.id} />
              {member.name}
            </label>
          ))}
        </div>
        {state.fieldErrors?.interviewerMembershipIds && (
          <p className="text-destructive text-xs">{state.fieldErrors.interviewerMembershipIds}</p>
        )}
      </div>

      {state.error && <p className="text-destructive text-sm">{state.error}</p>}

      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending ? "Scheduling…" : "Schedule interview"}
      </Button>
    </form>
  );
}
