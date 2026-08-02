import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { loadActiveMembership, ForbiddenError } from "@/domains/platform/authorization/policy";
import { OWNER_ROLE_NAME } from "@/domains/platform/authorization/roles";
import { createOrganization, SlugTakenError, updateOrganizationProfile } from "./organization.service";

/**
 * Integration test: exercises the real createOrganization transaction
 * against the disposable test database (.env.test), including the global
 * Owner role lookup, membership creation, and audit event write.
 */
describe("createOrganization", () => {
  const createdUserIds: string[] = [];
  const createdOrganizationIds: string[] = [];

  afterAll(async () => {
    // Respect FK order: pipeline stages/pipelines -> memberships/audit events
    // -> organizations -> users.
    await prisma.pipelineStage.deleteMany({
      where: { pipeline: { organizationId: { in: createdOrganizationIds } } },
    });
    await prisma.pipeline.deleteMany({ where: { organizationId: { in: createdOrganizationIds } } });
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

    const pipeline = await prisma.pipeline.findFirst({
      where: { organizationId: result.organizationId, isDefault: true },
      include: { stages: { orderBy: { order: "asc" } } },
    });
    expect(pipeline).not.toBeNull();
    expect(pipeline?.isSystem).toBe(true);
    expect(pipeline?.stages).toHaveLength(9);
    expect(pipeline?.stages.map((s) => s.order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(pipeline?.stages.at(-1)?.isTerminal).toBe(true);
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

  it("updates the organization profile and its branding", async () => {
    const user = await createTestUser();
    const slug = `test-org-${randomUUID().slice(0, 8)}`;
    const result = await createOrganization(user.id, {
      name: "Old Name",
      slug,
      country: "Tanzania",
      timezone: "Africa/Dar_es_Salaam",
    });
    createdOrganizationIds.push(result.organizationId);
    const membership = await loadActiveMembership(user.id, result.organizationId);
    if (!membership) throw new Error("Expected an active Owner membership.");

    const updated = await updateOrganizationProfile(membership, {
      name: "New Name",
      country: "Kenya",
      primaryColor: "#112233",
      logoUrl: "https://example.com/logo.png",
    });

    expect(updated.name).toBe("New Name");
    expect(updated.country).toBe("Kenya");

    const settings = await prisma.organizationSettings.findUnique({
      where: { organizationId: result.organizationId },
    });
    expect(settings?.branding).toMatchObject({
      primaryColor: "#112233",
      logoUrl: "https://example.com/logo.png",
    });

    const auditEvent = await prisma.auditEvent.findFirst({
      where: {
        entityType: "Organization",
        entityId: result.organizationId,
        action: "organization.updated",
      },
    });
    expect(auditEvent).not.toBeNull();
  });

  it("throws ForbiddenError updating the profile without organization.update", async () => {
    const user = await createTestUser();
    const slug = `test-org-${randomUUID().slice(0, 8)}`;
    const result = await createOrganization(user.id, {
      name: "Test Organization",
      slug,
      country: "Tanzania",
      timezone: "Africa/Dar_es_Salaam",
    });
    createdOrganizationIds.push(result.organizationId);

    const viewerRole = await prisma.role.findFirstOrThrow({
      where: { name: "Viewer", organizationId: null },
    });
    const viewerUser = await createTestUser();
    await prisma.membership.create({
      data: {
        organizationId: result.organizationId,
        userId: viewerUser.id,
        roleId: viewerRole.id,
        status: "ACTIVE",
        joinedAt: new Date(),
        lastActiveAt: new Date(),
      },
    });
    const viewerMembership = await loadActiveMembership(viewerUser.id, result.organizationId);
    if (!viewerMembership) throw new Error("Expected an active Viewer membership.");

    await expect(
      updateOrganizationProfile(viewerMembership, { name: "Nope", country: "Nope" }),
    ).rejects.toThrow(ForbiddenError);
  });
});
