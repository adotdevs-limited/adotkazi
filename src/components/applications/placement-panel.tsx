"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { Placement, PlacementStatus } from "@/generated/prisma/client";
import {
  activatePlacementAction,
  approvePlacementAction,
  assignSupervisorAction,
  cancelPlacementAction,
  completePlacementAction,
  createPlacementAction,
  resumePlacementAction,
  suspendPlacementAction,
  type PlacementActionState,
} from "@/domains/recruitment/placements/placement.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlacementStatusBadge } from "@/components/applications/placement-status-badge";

const SELECT_CLASS =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3";

export type PlacementWithSupervisor = Placement & {
  supervisorMembership: { user: { name: string } } | null;
};

export function PlacementPanel({
  applicationId,
  opportunityId,
  placement,
  orgMembers,
  canManage,
}: {
  applicationId: string;
  opportunityId: string;
  placement: PlacementWithSupervisor | null;
  orgMembers: Array<{ id: string; name: string }>;
  canManage: boolean;
}) {
  if (!placement && !canManage) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Placement</CardTitle>
      </CardHeader>
      <CardContent>
        {placement ? (
          <PlacementDetail
            placement={placement}
            applicationId={applicationId}
            opportunityId={opportunityId}
            orgMembers={orgMembers}
            canManage={canManage}
          />
        ) : (
          <CreatePlacementForm applicationId={applicationId} opportunityId={opportunityId} />
        )}
      </CardContent>
    </Card>
  );
}

function PlacementDetail({
  placement,
  applicationId,
  opportunityId,
  orgMembers,
  canManage,
}: {
  placement: PlacementWithSupervisor;
  applicationId: string;
  opportunityId: string;
  orgMembers: Array<{ id: string; name: string }>;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function run(action: () => Promise<PlacementActionState>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <PlacementStatusBadge status={placement.status} />
        {placement.startDate && (
          <span className="text-muted-foreground text-xs">
            {placement.startDate.toLocaleDateString()}
            {placement.endDate ? ` – ${placement.endDate.toLocaleDateString()}` : ""}
          </span>
        )}
      </div>

      <p className="text-muted-foreground text-xs">
        Supervisor: {placement.supervisorMembership?.user.name ?? "Not assigned"}
      </p>

      {canManage && (
        <div className="flex flex-wrap gap-2">
          {placement.status === "PENDING" && (
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() =>
                run(() => approvePlacementAction(opportunityId, applicationId, placement.id))
              }
            >
              Approve
            </Button>
          )}
          {placement.status === "APPROVED" && (
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() =>
                run(() => activatePlacementAction(opportunityId, applicationId, placement.id))
              }
            >
              Start training
            </Button>
          )}
          {placement.status === "ACTIVE" && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  run(() => completePlacementAction(opportunityId, applicationId, placement.id))
                }
              >
                Mark completed
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  run(() => suspendPlacementAction(opportunityId, applicationId, placement.id))
                }
              >
                Suspend
              </Button>
            </>
          )}
          {placement.status === "SUSPENDED" && (
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() =>
                run(() => resumePlacementAction(opportunityId, applicationId, placement.id))
              }
            >
              Resume
            </Button>
          )}
          {(["PENDING", "APPROVED", "ACTIVE", "SUSPENDED"] as PlacementStatus[]).includes(
            placement.status,
          ) && (
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() =>
                run(() => cancelPlacementAction(opportunityId, applicationId, placement.id))
              }
            >
              Cancel
            </Button>
          )}
        </div>
      )}

      {canManage && (
        <AssignSupervisorForm
          applicationId={applicationId}
          opportunityId={opportunityId}
          placementId={placement.id}
          orgMembers={orgMembers}
        />
      )}
    </div>
  );
}

function CreatePlacementForm({
  applicationId,
  opportunityId,
}: {
  applicationId: string;
  opportunityId: string;
}) {
  const initialState: PlacementActionState = { error: null };
  const [state, formAction, isPending] = useActionState(
    createPlacementAction.bind(null, opportunityId, applicationId),
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-1.5">
        <Label htmlFor="startDate">Start date</Label>
        <Input id="startDate" name="startDate" type="date" />
        {state.fieldErrors?.startDate && (
          <p className="text-destructive text-xs">{state.fieldErrors.startDate}</p>
        )}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="endDate">End date</Label>
        <Input id="endDate" name="endDate" type="date" />
        {state.fieldErrors?.endDate && (
          <p className="text-destructive text-xs">{state.fieldErrors.endDate}</p>
        )}
      </div>

      {state.error && <p className="text-destructive col-span-full text-sm">{state.error}</p>}

      <Button type="submit" size="sm" disabled={isPending} className="col-span-full w-fit">
        {isPending ? "Creating…" : "Create placement"}
      </Button>
    </form>
  );
}

function AssignSupervisorForm({
  applicationId,
  opportunityId,
  placementId,
  orgMembers,
}: {
  applicationId: string;
  opportunityId: string;
  placementId: string;
  orgMembers: Array<{ id: string; name: string }>;
}) {
  const initialState: PlacementActionState = { error: null };
  const [state, formAction, isPending] = useActionState(
    assignSupervisorAction.bind(null, opportunityId, applicationId, placementId),
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2 border-t pt-3">
      <div className="grid gap-1.5">
        <Label htmlFor="supervisorMembershipId">Assign supervisor</Label>
        <select id="supervisorMembershipId" name="supervisorMembershipId" className={SELECT_CLASS}>
          <option value="">Select a member…</option>
          {orgMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
        {state.fieldErrors?.supervisorMembershipId && (
          <p className="text-destructive text-xs">{state.fieldErrors.supervisorMembershipId}</p>
        )}
      </div>
      {state.error && <p className="text-destructive text-xs">{state.error}</p>}
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Assigning…" : "Assign"}
      </Button>
    </form>
  );
}
