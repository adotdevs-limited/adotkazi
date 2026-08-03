"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { Offer } from "@/generated/prisma/client";
import {
  extendOfferAction,
  withdrawOfferAction,
  type OfferActionState,
} from "@/domains/recruitment/offers/offer.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OfferStatusBadge } from "@/components/applications/offer-status-badge";

function formatOfferSummary(offer: Offer) {
  const parts: string[] = [];
  if (offer.salary) parts.push(`${offer.salary} ${offer.currency ?? ""}`.trim());
  if (offer.startDate) parts.push(`starts ${offer.startDate.toLocaleDateString()}`);
  if (offer.expiresAt) parts.push(`expires ${offer.expiresAt.toLocaleDateString()}`);
  return parts.length > 0 ? parts.join(" · ") : "No details provided.";
}

export function OfferPanel({
  applicationId,
  opportunityId,
  activeOffer,
  pastOffers,
  canManage,
}: {
  applicationId: string;
  opportunityId: string;
  activeOffer: Offer | null;
  pastOffers: Offer[];
  canManage: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Offer</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {activeOffer ? (
          <ActiveOffer
            offer={activeOffer}
            opportunityId={opportunityId}
            applicationId={applicationId}
            canManage={canManage}
          />
        ) : canManage ? (
          <ExtendOfferForm opportunityId={opportunityId} applicationId={applicationId} />
        ) : (
          <p className="text-muted-foreground text-sm">No active offer.</p>
        )}

        {pastOffers.length > 0 && (
          <div className="grid gap-1 border-t pt-3">
            <p className="text-muted-foreground text-xs font-medium">Previous offers</p>
            {pastOffers.map((offer) => (
              <div key={offer.id} className="flex items-center gap-2 text-sm">
                <OfferStatusBadge status={offer.status} />
                <span className="text-muted-foreground truncate text-xs">
                  {formatOfferSummary(offer)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActiveOffer({
  offer,
  opportunityId,
  applicationId,
  canManage,
}: {
  offer: Offer;
  opportunityId: string;
  applicationId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function withdraw() {
    startTransition(async () => {
      const result = await withdrawOfferAction(opportunityId, applicationId, offer.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <OfferStatusBadge status={offer.status} />
        <span className="text-sm">{formatOfferSummary(offer)}</span>
      </div>
      {canManage && (
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={isPending}
          onClick={withdraw}
        >
          Withdraw offer
        </Button>
      )}
    </div>
  );
}

function ExtendOfferForm({
  opportunityId,
  applicationId,
}: {
  opportunityId: string;
  applicationId: string;
}) {
  const initialState: OfferActionState = { error: null };
  const [state, formAction, isPending] = useActionState(
    extendOfferAction.bind(null, opportunityId, applicationId),
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-1.5">
        <Label htmlFor="salary">Salary</Label>
        <Input id="salary" name="salary" type="number" min="0" step="0.01" />
        {state.fieldErrors?.salary && (
          <p className="text-destructive text-xs">{state.fieldErrors.salary}</p>
        )}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="currency">Currency</Label>
        <Input id="currency" name="currency" placeholder="USD" maxLength={10} />
        {state.fieldErrors?.currency && (
          <p className="text-destructive text-xs">{state.fieldErrors.currency}</p>
        )}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="startDate">Start date</Label>
        <Input id="startDate" name="startDate" type="date" />
        {state.fieldErrors?.startDate && (
          <p className="text-destructive text-xs">{state.fieldErrors.startDate}</p>
        )}
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="expiresAt">Respond by</Label>
        <Input id="expiresAt" name="expiresAt" type="date" />
        {state.fieldErrors?.expiresAt && (
          <p className="text-destructive text-xs">{state.fieldErrors.expiresAt}</p>
        )}
      </div>

      {state.error && <p className="text-destructive col-span-full text-sm">{state.error}</p>}

      <Button type="submit" disabled={isPending} className="col-span-full w-fit">
        {isPending ? "Sending…" : "Extend offer"}
      </Button>
    </form>
  );
}
