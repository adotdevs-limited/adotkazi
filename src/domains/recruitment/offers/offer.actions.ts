"use server";

import { revalidatePath } from "next/cache";

import {
  requireCurrentUser,
  getActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import type { ActiveMembership } from "@/domains/platform/authorization/policy";
import { extendOfferSchema } from "./offer.schema";
import { extendOffer, withdrawOffer, acceptOffer, declineOffer } from "./offer.service";

export type OfferActionState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

async function runOfferLifecycleAction(
  perform: (membership: ActiveMembership) => Promise<unknown>,
  opportunityId: string,
  applicationId: string,
): Promise<OfferActionState> {
  const user = await requireCurrentUser();
  const membership = await getActiveMembership(user.id);
  if (!membership) {
    return { error: "You must belong to an organization to manage offers." };
  }

  try {
    await perform(membership);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }

  revalidatePath(`/dashboard/opportunities/${opportunityId}/applications/${applicationId}`);
  return { error: null };
}

export async function extendOfferAction(
  opportunityId: string,
  applicationId: string,
  _prevState: OfferActionState,
  formData: FormData,
): Promise<OfferActionState> {
  const parsed = extendOfferSchema.safeParse({
    salary: formData.get("salary"),
    currency: formData.get("currency"),
    startDate: formData.get("startDate"),
    expiresAt: formData.get("expiresAt"),
  });
  if (!parsed.success) {
    return {
      error: null,
      fieldErrors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([key, messages]) => [
          key,
          messages?.[0] ?? "Invalid value.",
        ]),
      ),
    };
  }

  return runOfferLifecycleAction(
    (membership) => extendOffer(membership, applicationId, parsed.data),
    opportunityId,
    applicationId,
  );
}

export async function withdrawOfferAction(
  opportunityId: string,
  applicationId: string,
  offerId: string,
): Promise<OfferActionState> {
  return runOfferLifecycleAction(
    (membership) => withdrawOffer(membership, offerId),
    opportunityId,
    applicationId,
  );
}

export type OfferResponseState = { error: string | null };

export async function acceptOfferAction(offerId: string): Promise<OfferResponseState> {
  const user = await requireCurrentUser();
  try {
    await acceptOffer(user, offerId);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }
  revalidatePath("/applications");
  return { error: null };
}

export async function declineOfferAction(offerId: string): Promise<OfferResponseState> {
  const user = await requireCurrentUser();
  try {
    await declineOffer(user, offerId);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }
  revalidatePath("/applications");
  return { error: null };
}
