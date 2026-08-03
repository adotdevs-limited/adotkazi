"use server";

import { revalidatePath } from "next/cache";

import {
  requireCurrentUser,
  getActiveMembership,
} from "@/domains/platform/tenancy/active-organization";
import type { ActiveMembership } from "@/domains/platform/authorization/policy";
import { createPlacementSchema, assignSupervisorSchema } from "./placement.schema";
import {
  activatePlacement,
  approvePlacement,
  assignSupervisor,
  cancelPlacement,
  completePlacement,
  createPlacement,
  resumePlacement,
  suspendPlacement,
} from "./placement.service";

export type PlacementActionState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

async function runPlacementAction(
  perform: (membership: ActiveMembership) => Promise<unknown>,
  opportunityId: string,
  applicationId: string,
): Promise<PlacementActionState> {
  const user = await requireCurrentUser();
  const membership = await getActiveMembership(user.id);
  if (!membership) {
    return { error: "You must belong to an organization to manage placements." };
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

export async function createPlacementAction(
  opportunityId: string,
  applicationId: string,
  _prevState: PlacementActionState,
  formData: FormData,
): Promise<PlacementActionState> {
  const parsed = createPlacementSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
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

  return runPlacementAction(
    (membership) => createPlacement(membership, applicationId, parsed.data),
    opportunityId,
    applicationId,
  );
}

export async function assignSupervisorAction(
  opportunityId: string,
  applicationId: string,
  placementId: string,
  _prevState: PlacementActionState,
  formData: FormData,
): Promise<PlacementActionState> {
  const parsed = assignSupervisorSchema.safeParse({
    supervisorMembershipId: formData.get("supervisorMembershipId"),
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

  return runPlacementAction(
    (membership) => assignSupervisor(membership, placementId, parsed.data.supervisorMembershipId),
    opportunityId,
    applicationId,
  );
}

export async function approvePlacementAction(
  opportunityId: string,
  applicationId: string,
  placementId: string,
): Promise<PlacementActionState> {
  return runPlacementAction(
    (membership) => approvePlacement(membership, placementId),
    opportunityId,
    applicationId,
  );
}

export async function activatePlacementAction(
  opportunityId: string,
  applicationId: string,
  placementId: string,
): Promise<PlacementActionState> {
  return runPlacementAction(
    (membership) => activatePlacement(membership, placementId),
    opportunityId,
    applicationId,
  );
}

export async function suspendPlacementAction(
  opportunityId: string,
  applicationId: string,
  placementId: string,
): Promise<PlacementActionState> {
  return runPlacementAction(
    (membership) => suspendPlacement(membership, placementId),
    opportunityId,
    applicationId,
  );
}

export async function resumePlacementAction(
  opportunityId: string,
  applicationId: string,
  placementId: string,
): Promise<PlacementActionState> {
  return runPlacementAction(
    (membership) => resumePlacement(membership, placementId),
    opportunityId,
    applicationId,
  );
}

export async function completePlacementAction(
  opportunityId: string,
  applicationId: string,
  placementId: string,
): Promise<PlacementActionState> {
  return runPlacementAction(
    (membership) => completePlacement(membership, placementId),
    opportunityId,
    applicationId,
  );
}

export async function cancelPlacementAction(
  opportunityId: string,
  applicationId: string,
  placementId: string,
): Promise<PlacementActionState> {
  return runPlacementAction(
    (membership) => cancelPlacement(membership, placementId),
    opportunityId,
    applicationId,
  );
}
