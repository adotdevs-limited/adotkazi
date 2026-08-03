import "server-only";

import type { SavedOpportunity } from "@/generated/prisma/client";
import type { CurrentUser } from "@/domains/platform/tenancy/active-organization";
import { findOrganizationBySlug } from "@/domains/platform/organizations/organization.repository";
import { findPublicOpportunityBySlug } from "@/domains/recruitment/opportunities/opportunity.repository";
import { findOrCreateCandidateForUser } from "@/domains/recruitment/applications/application.repository";
import {
  createSavedOpportunity,
  deleteSavedOpportunity,
  findSavedOpportunity,
  findSavedOpportunityByIdForUser,
} from "./saved-opportunity.repository";

export class OpportunityNotFoundError extends Error {
  constructor() {
    super("That opportunity could not be found.");
    this.name = "OpportunityNotFoundError";
  }
}

export class AlreadySavedError extends Error {
  constructor() {
    super("You've already saved this opportunity.");
    this.name = "AlreadySavedError";
  }
}

export class SavedOpportunityNotFoundError extends Error {
  constructor() {
    super("That saved opportunity could not be found.");
    this.name = "SavedOpportunityNotFoundError";
  }
}

export async function saveOpportunity(
  user: CurrentUser,
  input: { organizationSlug: string; opportunitySlug: string },
): Promise<SavedOpportunity> {
  const organization = await findOrganizationBySlug(input.organizationSlug);
  if (!organization || (organization.status !== "ACTIVE" && organization.status !== "TRIAL")) {
    throw new OpportunityNotFoundError();
  }

  const opportunity = await findPublicOpportunityBySlug(organization.id, input.opportunitySlug);
  if (!opportunity) {
    throw new OpportunityNotFoundError();
  }

  const candidate = await findOrCreateCandidateForUser(user.id);

  const existing = await findSavedOpportunity(candidate.id, opportunity.id);
  if (existing) {
    throw new AlreadySavedError();
  }

  return createSavedOpportunity(candidate.id, opportunity.id);
}

export async function unsaveOpportunity(userId: string, savedOpportunityId: string): Promise<void> {
  const saved = await findSavedOpportunityByIdForUser(savedOpportunityId, userId);
  if (!saved) {
    throw new SavedOpportunityNotFoundError();
  }
  await deleteSavedOpportunity(saved.id);
}
