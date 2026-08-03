"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  acceptOfferAction,
  declineOfferAction,
  type OfferResponseState,
} from "@/domains/recruitment/offers/offer.actions";
import { Button } from "@/components/ui/button";

export function OfferResponseActions({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function run(action: () => Promise<OfferResponseState>) {
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
    <div className="flex gap-2">
      <Button disabled={isPending} onClick={() => run(() => acceptOfferAction(offerId))}>
        Accept offer
      </Button>
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() => run(() => declineOfferAction(offerId))}
      >
        Decline offer
      </Button>
    </div>
  );
}
