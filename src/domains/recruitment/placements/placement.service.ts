import "server-only";

import type { Placement, PlacementStatus } from "@/generated/prisma/client";
import { recordAuditEvent } from "@/domains/platform/audit/audit.service";
import type { CurrentUser } from "@/domains/platform/tenancy/active-organization";
import {
  can,
  requirePermission,
  type ActiveMembership,
} from "@/domains/platform/authorization/policy";
import { findApplicationById } from "@/domains/recruitment/applications/application.repository";
import { ApplicationNotFoundError } from "@/domains/recruitment/applications/application.service";
import { listMembers } from "@/domains/platform/memberships/membership.repository";
import type { CreatePlacementInput } from "./placement.schema";
import {
  assignSupervisor as assignSupervisorRecord,
  createPlacementRecord,
  findPlacementByApplicationId,
  findPlacementById,
  listPlacementsForSupervisor,
  updatePlacementStatus,
} from "./placement.repository";

export { PLACEMENT_TRACK_OPPORTUNITY_TYPES } from "@/domains/recruitment/opportunities/opportunity.schema";

export class ApplicationNotActiveError extends Error {
  constructor() {
    super("Only an active application can be placed.");
    this.name = "ApplicationNotActiveError";
  }
}

export class PlacementAlreadyExistsError extends Error {
  constructor() {
    super("This application already has a placement.");
    this.name = "PlacementAlreadyExistsError";
  }
}

export class PlacementNotFoundError extends Error {
  constructor() {
    super("That placement could not be found.");
    this.name = "PlacementNotFoundError";
  }
}

export class InvalidPlacementStatusTransitionError extends Error {
  constructor(from: PlacementStatus, to: PlacementStatus) {
    super(`Cannot move a placement from ${from} to ${to}.`);
    this.name = "InvalidPlacementStatusTransitionError";
  }
}

export class InvalidSupervisorError extends Error {
  constructor() {
    super("The selected supervisor doesn't belong to this organization.");
    this.name = "InvalidSupervisorError";
  }
}

export class NotAssignedSupervisorError extends Error {
  constructor() {
    super("You're not the assigned supervisor for this placement.");
    this.name = "NotAssignedSupervisorError";
  }
}

/** Shared by placement.service.ts and daily-log.service.ts: the permission
 *  gates the class of action, this confirms the actor is either the
 *  placement's actually-assigned supervisor or holds the admin-override
 *  permission (placement.manage), since permission grants aren't per-resource. */
export function ensureAssignedSupervisorOrAdmin(
  membership: ActiveMembership,
  placement: { supervisorMembershipId: string | null },
) {
  const isAssignedSupervisor = placement.supervisorMembershipId === membership.membershipId;
  const isAdminOverride = can(membership, "placement.manage");
  if (!isAssignedSupervisor && !isAdminOverride) {
    throw new NotAssignedSupervisorError();
  }
}

async function loadApplicationInOrganizationOrThrow(applicationId: string, organizationId: string) {
  const application = await findApplicationById(applicationId);
  if (!application || application.opportunity.organizationId !== organizationId) {
    throw new ApplicationNotFoundError();
  }
  return application;
}

async function loadPlacementInOrganizationOrThrow(placementId: string, organizationId: string) {
  const placement = await findPlacementById(placementId);
  if (!placement || placement.application.organizationId !== organizationId) {
    throw new PlacementNotFoundError();
  }
  return placement;
}

export async function createPlacement(
  membership: ActiveMembership,
  applicationId: string,
  input: CreatePlacementInput,
): Promise<Placement> {
  requirePermission(membership, "placement.manage");

  const application = await loadApplicationInOrganizationOrThrow(
    applicationId,
    membership.organizationId,
  );
  if (application.status !== "ACTIVE") {
    throw new ApplicationNotActiveError();
  }

  const existing = await findPlacementByApplicationId(applicationId);
  if (existing) {
    throw new PlacementAlreadyExistsError();
  }

  const placement = await createPlacementRecord({
    applicationId,
    startDate: input.startDate,
    endDate: input.endDate,
    createdBy: membership.userId,
  });

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "Placement",
    entityId: placement.id,
    action: "placement.created",
    after: { applicationId },
  });

  return placement;
}

async function transitionPlacementStatus(
  membership: ActiveMembership,
  placementId: string,
  allowedFrom: PlacementStatus[],
  to: PlacementStatus,
  auditAction: string,
): Promise<Placement> {
  requirePermission(membership, "placement.manage");

  const placement = await loadPlacementInOrganizationOrThrow(placementId, membership.organizationId);
  if (!allowedFrom.includes(placement.status)) {
    throw new InvalidPlacementStatusTransitionError(placement.status, to);
  }

  const updated = await updatePlacementStatus(placementId, to, membership.userId);

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "Placement",
    entityId: placementId,
    action: auditAction,
    before: { status: placement.status },
    after: { status: to },
  });

  return updated;
}

export function approvePlacement(membership: ActiveMembership, placementId: string) {
  return transitionPlacementStatus(
    membership,
    placementId,
    ["PENDING"],
    "APPROVED",
    "placement.approved",
  );
}

export function activatePlacement(membership: ActiveMembership, placementId: string) {
  return transitionPlacementStatus(
    membership,
    placementId,
    ["APPROVED"],
    "ACTIVE",
    "placement.activated",
  );
}

export function suspendPlacement(membership: ActiveMembership, placementId: string) {
  return transitionPlacementStatus(
    membership,
    placementId,
    ["ACTIVE"],
    "SUSPENDED",
    "placement.suspended",
  );
}

export function resumePlacement(membership: ActiveMembership, placementId: string) {
  return transitionPlacementStatus(
    membership,
    placementId,
    ["SUSPENDED"],
    "ACTIVE",
    "placement.resumed",
  );
}

export function completePlacement(membership: ActiveMembership, placementId: string) {
  return transitionPlacementStatus(
    membership,
    placementId,
    ["ACTIVE"],
    "COMPLETED",
    "placement.completed",
  );
}

export function cancelPlacement(membership: ActiveMembership, placementId: string) {
  return transitionPlacementStatus(
    membership,
    placementId,
    ["PENDING", "APPROVED", "ACTIVE", "SUSPENDED"],
    "CANCELLED",
    "placement.cancelled",
  );
}

export async function assignSupervisor(
  membership: ActiveMembership,
  placementId: string,
  supervisorMembershipId: string,
): Promise<Placement> {
  requirePermission(membership, "placement.manage");

  await loadPlacementInOrganizationOrThrow(placementId, membership.organizationId);

  const members = await listMembers(membership.organizationId);
  const isValidSupervisor = members.some(
    (member) => member.id === supervisorMembershipId && member.status === "ACTIVE",
  );
  if (!isValidSupervisor) {
    throw new InvalidSupervisorError();
  }

  const updated = await assignSupervisorRecord(placementId, supervisorMembershipId, membership.userId);

  await recordAuditEvent({
    organizationId: membership.organizationId,
    actorUserId: membership.userId,
    entityType: "Placement",
    entityId: placementId,
    action: "placement.supervisor_assigned",
    after: { supervisorMembershipId },
  });

  return updated;
}

export async function getPlacementForApplication(
  membership: ActiveMembership,
  applicationId: string,
) {
  requirePermission(membership, "placement.view");

  await loadApplicationInOrganizationOrThrow(applicationId, membership.organizationId);
  return findPlacementByApplicationId(applicationId);
}

/** "My students" — every placement assigned to the caller's own membership,
 *  regardless of role. This is the only UI path a Supervisor has into
 *  placement/daily-log data, since Supervisor doesn't hold application.view. */
export async function getSupervisedPlacements(membership: ActiveMembership) {
  requirePermission(membership, "placement.view");
  return listPlacementsForSupervisor(membership.membershipId);
}

export async function getPlacementForSupervisor(membership: ActiveMembership, placementId: string) {
  requirePermission(membership, "placement.view");

  const placement = await loadPlacementInOrganizationOrThrow(placementId, membership.organizationId);
  ensureAssignedSupervisorOrAdmin(membership, placement);

  return placement;
}

export async function getPlacementForCandidateApplication(user: CurrentUser, applicationId: string) {
  const application = await findApplicationById(applicationId);
  if (!application || application.candidate.userId !== user.id) {
    throw new ApplicationNotFoundError();
  }
  return { application, placement: await findPlacementByApplicationId(applicationId) };
}
