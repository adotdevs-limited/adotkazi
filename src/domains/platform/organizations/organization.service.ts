import "server-only";

import { prisma } from "@/lib/db";
import { recordAuditEvent } from "@/domains/platform/audit/audit.service";
import { OWNER_ROLE_NAME } from "@/domains/platform/authorization/roles";
import { createDefaultPipeline } from "@/domains/recruitment/pipelines/pipeline.repository";
import type { CreateOrganizationInput } from "./organization.schema";
import { createOrganizationRecord, isSlugTaken } from "./organization.repository";

export class SlugTakenError extends Error {
  constructor() {
    super("That URL is already taken. Try a different one.");
    this.name = "SlugTakenError";
  }
}

/**
 * Creates a new organization and makes `userId` its Owner.
 *
 * The Owner role is a global system role (see roles.ts / seed.ts) — it is
 * looked up, never created here, so every organization shares the same
 * canonical permission set for "Owner."
 */
export async function createOrganization(
  userId: string,
  input: CreateOrganizationInput,
): Promise<{ organizationId: string; slug: string }> {
  if (await isSlugTaken(input.slug)) {
    throw new SlugTakenError();
  }

  const ownerRole = await prisma.role.findFirst({
    where: { name: OWNER_ROLE_NAME, organizationId: null },
    select: { id: true },
  });

  if (!ownerRole) {
    throw new Error(
      "The 'Owner' system role is missing. Run the database seed before creating organizations.",
    );
  }

  const organization = await prisma.$transaction(async (tx) => {
    const org = await createOrganizationRecord(tx, {
      name: input.name,
      slug: input.slug,
      country: input.country,
      timezone: input.timezone,
      createdBy: userId,
    });

    await tx.membership.create({
      data: {
        organizationId: org.id,
        userId,
        roleId: ownerRole.id,
        status: "ACTIVE",
        joinedAt: new Date(),
        lastActiveAt: new Date(),
      },
    });

    // Direct cross-bounded-context call (Platform → Recruitment) — no event
    // bus/queue exists yet in this codebase. Move this to an
    // OrganizationCreated event handler once real domain events exist.
    await createDefaultPipeline(tx, org.id);

    await recordAuditEvent(
      {
        organizationId: org.id,
        actorUserId: userId,
        entityType: "Organization",
        entityId: org.id,
        action: "organization.created",
        after: { name: org.name, slug: org.slug },
      },
      tx,
    );

    return org;
  });

  return { organizationId: organization.id, slug: organization.slug };
}
