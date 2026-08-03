import "server-only";

import type { ApplicationNote } from "@/generated/prisma/client";
import { requirePermission, type ActiveMembership } from "@/domains/platform/authorization/policy";
import { findApplicationById } from "@/domains/recruitment/applications/application.repository";
import { ApplicationNotFoundError } from "@/domains/recruitment/applications/application.service";
import type { AddNoteInput } from "./note.schema";
import { createNote } from "./note.repository";

export async function addNote(
  membership: ActiveMembership,
  applicationId: string,
  input: AddNoteInput,
): Promise<ApplicationNote> {
  requirePermission(membership, "application.view");

  const application = await findApplicationById(applicationId);
  if (!application || application.opportunity.organizationId !== membership.organizationId) {
    throw new ApplicationNotFoundError();
  }

  return createNote({
    applicationId,
    authorMembershipId: membership.membershipId,
    body: input.body,
  });
}
