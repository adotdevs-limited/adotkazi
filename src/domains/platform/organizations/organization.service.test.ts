import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { loadActiveMembership } from "@/domains/platform/authorization/policy";
import { OWNER_ROLE_NAME } from "@/domains/platform/authorization/roles";
import { createOrganization, SlugTakenError } from "./organization.service";

/**
 * Integration test: exercises the real createOrganization transaction
 * against the disposable test database (.env.test), including the global
 * Owner role lookup, membership creation, and audit event write.
 */
describe("createOrganization", () => {
  const createdUserIds: string[] = [];
  const createdOrganizationIds: string[] = [];

  afterAll(async () => {
    // Respect FK order: memberships/audit events -> organizations -> users.
    await prisma.membership.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.auditEvent.deleteMany({ where: { actorUserId: { in: createdUserIds } } });
    await prisma.organizationSettings.deleteMany({
      where: { organizationId: { in: createdOrganizationIds } },
    });
    await prisma.organization.deleteMany({ where: { id: { in: createdOrganizationIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  async function createTestUser() {
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        name: "Test User",
        email: `test-${randomUUID()}@example.com`,
      },
    });
    createdUserIds.push(user.id);
    return user;
  }

  it("creates an organization and makes the creator its Owner", async () => {
    const user = await createTestUser();
    const slug = `test-org-${randomUUID().slice(0, 8)}`;

    const result = await createOrganization(user.id, {
      name: "Test Organization",
      slug,
      country: "Tanzania",
      timezone: "Africa/Dar_es_Salaam",
    });

    createdOrganizationIds.push(result.organizationId);
    expect(result.slug).toBe(slug);

    const membership = await loadActiveMembership(user.id, result.organizationId);
    expect(membership).not.toBeNull();
    expect(membership?.roleName).toBe(OWNER_ROLE_NAME);
    expect(membership?.permissions.has("organization.update")).toBe(true);

    const auditEvent = await prisma.auditEvent.findFirst({
      where: { entityType: "Organization", entityId: result.organizationId },
    });
    expect(auditEvent?.action).toBe("organization.created");

    const settings = await prisma.organizationSettings.findUnique({
      where: { organizationId: result.organizationId },
    });
    expect(settings).not.toBeNull();
  });

  it("rejects a slug that is already taken", async () => {
    const user = await createTestUser();
    const slug = `test-org-${randomUUID().slice(0, 8)}`;

    const first = await createOrganization(user.id, {
      name: "First Org",
      slug,
      country: "Tanzania",
      timezone: "Africa/Dar_es_Salaam",
    });
    createdOrganizationIds.push(first.organizationId);

    const secondUser = await createTestUser();
    await expect(
      createOrganization(secondUser.id, {
        name: "Second Org",
        slug,
        country: "Tanzania",
        timezone: "Africa/Dar_es_Salaam",
      }),
    ).rejects.toThrow(SlugTakenError);
  });
});
