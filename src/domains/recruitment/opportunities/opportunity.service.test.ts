import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { loadActiveMembership, ForbiddenError } from "@/domains/platform/authorization/policy";
import { createOrganization } from "@/domains/platform/organizations/organization.service";
import type { CreateOpportunityInput } from "./opportunity.schema";
import { listOpportunitiesForOrganization } from "./opportunity.repository";
import {
  archiveOpportunity,
  closeOpportunity,
  createOpportunity,
  deleteOpportunity,
  InvalidOpportunityStatusTransitionError,
  OpportunitySlugTakenError,
  publishOpportunity,
  updateOpportunity,
} from "./opportunity.service";

/**
 * Integration test: exercises the real opportunity service against the
 * disposable test database (.env.test) — creation, the status state
 * machine, permission checks, and audit events. No Prisma mocking.
 */
describe("opportunity.service", () => {
  const createdUserIds: string[] = [];
  const createdOrganizationIds: string[] = [];

  afterAll(async () => {
    // Respect FK order: opportunities -> pipeline stages/pipelines/departments
    // -> memberships/audit events -> organizations -> users.
    await prisma.opportunity.deleteMany({
      where: { organizationId: { in: createdOrganizationIds } },
    });
    await prisma.pipelineStage.deleteMany({
      where: { pipeline: { organizationId: { in: createdOrganizationIds } } },
    });
    await prisma.pipeline.deleteMany({ where: { organizationId: { in: createdOrganizationIds } } });
    await prisma.department.deleteMany({
      where: { organizationId: { in: createdOrganizationIds } },
    });
    await prisma.membership.deleteMany({
      where: { organizationId: { in: createdOrganizationIds } },
    });
    await prisma.auditEvent.deleteMany({
      where: { organizationId: { in: createdOrganizationIds } },
    });
    await prisma.organizationSettings.deleteMany({
      where: { organizationId: { in: createdOrganizationIds } },
    });
    await prisma.organization.deleteMany({ where: { id: { in: createdOrganizationIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.$disconnect();
  });

  async function createTestUser() {
    const user = await prisma.user.create({
      data: { id: randomUUID(), name: "Test User", email: `test-${randomUUID()}@example.com` },
    });
    createdUserIds.push(user.id);
    return user;
  }

  /** New org + Owner membership (Owner carries every opportunity.* grant). */
  async function createTestOrgWithOwner() {
    const owner = await createTestUser();
    const slug = `test-org-${randomUUID().slice(0, 8)}`;
    const org = await createOrganization(owner.id, {
      name: "Test Recruitment Org",
      slug,
      country: "Tanzania",
      timezone: "Africa/Dar_es_Salaam",
    });
    createdOrganizationIds.push(org.organizationId);

    const membership = await loadActiveMembership(owner.id, org.organizationId);
    if (!membership) throw new Error("Expected an active Owner membership.");

    return { organizationId: org.organizationId, ownerUser: owner, membership };
  }

  async function createTestDepartment(organizationId: string) {
    return prisma.department.create({
      data: { organizationId, name: `Engineering-${randomUUID().slice(0, 8)}` },
    });
  }

  /** A membership with only Viewer-level permissions (no opportunity.create). */
  async function createViewerMembership(organizationId: string) {
    const viewerRole = await prisma.role.findFirstOrThrow({
      where: { name: "Viewer", organizationId: null },
    });
    const user = await createTestUser();
    await prisma.membership.create({
      data: {
        organizationId,
        userId: user.id,
        roleId: viewerRole.id,
        status: "ACTIVE",
        joinedAt: new Date(),
        lastActiveAt: new Date(),
      },
    });
    const membership = await loadActiveMembership(user.id, organizationId);
    if (!membership) throw new Error("Expected an active Viewer membership.");
    return membership;
  }

  function buildCreateInput(
    departmentId: string,
    overrides: Partial<CreateOpportunityInput> = {},
  ): CreateOpportunityInput {
    return {
      title: "Senior Software Engineer",
      slug: `senior-software-engineer-${randomUUID().slice(0, 8)}`,
      departmentId,
      opportunityType: "FULL_TIME",
      workplaceType: "REMOTE",
      openings: 1,
      visibility: "PUBLIC",
      ...overrides,
    };
  }

  it("creates an opportunity in DRAFT status, using the org's default pipeline", async () => {
    const { organizationId, membership } = await createTestOrgWithOwner();
    const department = await createTestDepartment(organizationId);

    const opportunity = await createOpportunity(membership, buildCreateInput(department.id));

    expect(opportunity.status).toBe("DRAFT");
    expect(opportunity.pipelineId).not.toBeNull();

    const auditEvent = await prisma.auditEvent.findFirst({
      where: { entityType: "Opportunity", entityId: opportunity.id, action: "opportunity.created" },
    });
    expect(auditEvent).not.toBeNull();
  });

  it("rejects a duplicate slug within the same organization", async () => {
    const { organizationId, membership } = await createTestOrgWithOwner();
    const department = await createTestDepartment(organizationId);
    const slug = `duplicate-slug-${randomUUID().slice(0, 8)}`;

    await createOpportunity(membership, buildCreateInput(department.id, { slug }));

    await expect(
      createOpportunity(membership, buildCreateInput(department.id, { slug })),
    ).rejects.toThrow(OpportunitySlugTakenError);
  });

  it("allows the same slug across different organizations", async () => {
    const first = await createTestOrgWithOwner();
    const firstDepartment = await createTestDepartment(first.organizationId);
    const second = await createTestOrgWithOwner();
    const secondDepartment = await createTestDepartment(second.organizationId);
    const slug = `shared-slug-${randomUUID().slice(0, 8)}`;

    await createOpportunity(first.membership, buildCreateInput(firstDepartment.id, { slug }));

    await expect(
      createOpportunity(second.membership, buildCreateInput(secondDepartment.id, { slug })),
    ).resolves.toMatchObject({ slug });
  });

  it("throws ForbiddenError without opportunity.create", async () => {
    const { organizationId } = await createTestOrgWithOwner();
    const department = await createTestDepartment(organizationId);
    const viewerMembership = await createViewerMembership(organizationId);

    await expect(
      createOpportunity(viewerMembership, buildCreateInput(department.id)),
    ).rejects.toThrow(ForbiddenError);
  });

  it("publishes a DRAFT opportunity", async () => {
    const { organizationId, membership } = await createTestOrgWithOwner();
    const department = await createTestDepartment(organizationId);
    const opportunity = await createOpportunity(membership, buildCreateInput(department.id));

    const published = await publishOpportunity(membership, opportunity.id);
    expect(published.status).toBe("PUBLISHED");

    const auditEvent = await prisma.auditEvent.findFirst({
      where: {
        entityType: "Opportunity",
        entityId: opportunity.id,
        action: "opportunity.published",
      },
    });
    expect(auditEvent).not.toBeNull();
  });

  it("rejects publishing an ARCHIVED opportunity", async () => {
    const { organizationId, membership } = await createTestOrgWithOwner();
    const department = await createTestDepartment(organizationId);
    const opportunity = await createOpportunity(membership, buildCreateInput(department.id));

    await archiveOpportunity(membership, opportunity.id);

    await expect(publishOpportunity(membership, opportunity.id)).rejects.toThrow(
      InvalidOpportunityStatusTransitionError,
    );
  });

  it("rejects updating a CLOSED opportunity", async () => {
    const { organizationId, membership } = await createTestOrgWithOwner();
    const department = await createTestDepartment(organizationId);
    const opportunity = await createOpportunity(membership, buildCreateInput(department.id));

    await publishOpportunity(membership, opportunity.id);
    await closeOpportunity(membership, opportunity.id);

    await expect(
      updateOpportunity(membership, opportunity.id, buildCreateInput(department.id)),
    ).rejects.toThrow(InvalidOpportunityStatusTransitionError);
  });

  it("excludes soft-deleted opportunities from listOpportunitiesForOrganization", async () => {
    const { organizationId, membership } = await createTestOrgWithOwner();
    const department = await createTestDepartment(organizationId);
    const opportunity = await createOpportunity(membership, buildCreateInput(department.id));

    let list = await listOpportunitiesForOrganization(organizationId);
    expect(list.map((o) => o.id)).toContain(opportunity.id);

    await deleteOpportunity(membership, opportunity.id);

    list = await listOpportunitiesForOrganization(organizationId);
    expect(list.map((o) => o.id)).not.toContain(opportunity.id);
  });
});
