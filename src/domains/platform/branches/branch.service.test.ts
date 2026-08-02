import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { loadActiveMembership, ForbiddenError } from "@/domains/platform/authorization/policy";
import { createOrganization } from "@/domains/platform/organizations/organization.service";
import { createOpportunity } from "@/domains/recruitment/opportunities/opportunity.service";
import { findDefaultPipeline } from "@/domains/recruitment/pipelines/pipeline.repository";
import { BranchInUseError, createBranch, deleteBranch, updateBranch } from "./branch.service";

/**
 * Integration test: exercises the real branch service against the
 * disposable test database — CRUD, the in-use delete guard, and
 * permission checks. No Prisma mocking.
 */
describe("branch.service", () => {
  const createdUserIds: string[] = [];
  const createdOrganizationIds: string[] = [];

  afterAll(async () => {
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
    await prisma.branch.deleteMany({ where: { organizationId: { in: createdOrganizationIds } } });
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

  function buildInput(overrides: Partial<Parameters<typeof createBranch>[1]> = {}) {
    return {
      name: "Dar es Salaam HQ",
      isHeadquarters: true,
      status: "ACTIVE" as const,
      ...overrides,
    };
  }

  it("creates a branch and records an audit event", async () => {
    const { membership } = await createTestOrgWithOwner();

    const branch = await createBranch(membership, buildInput());

    const auditEvent = await prisma.auditEvent.findFirst({
      where: { entityType: "Branch", entityId: branch.id, action: "branch.created" },
    });
    expect(auditEvent).not.toBeNull();
  });

  it("throws ForbiddenError without branch.manage", async () => {
    const { organizationId } = await createTestOrgWithOwner();
    const viewerMembership = await createViewerMembership(organizationId);

    await expect(createBranch(viewerMembership, buildInput())).rejects.toThrow(ForbiddenError);
  });

  it("updates a branch", async () => {
    const { membership } = await createTestOrgWithOwner();
    const branch = await createBranch(membership, buildInput({ name: "Old Name" }));

    const updated = await updateBranch(
      membership,
      branch.id,
      buildInput({ name: "New Name", city: "Dar es Salaam" }),
    );

    expect(updated.name).toBe("New Name");
    expect(updated.city).toBe("Dar es Salaam");
  });

  it("prevents deleting a branch used by an opportunity", async () => {
    const { organizationId, membership } = await createTestOrgWithOwner();
    const branch = await createBranch(membership, buildInput());
    const department = await prisma.department.create({
      data: { organizationId, name: `Engineering-${randomUUID().slice(0, 8)}` },
    });
    const pipeline = await findDefaultPipeline(organizationId);
    if (!pipeline) throw new Error("Expected a default pipeline.");

    await createOpportunity(membership, {
      title: "Software Engineer",
      slug: `software-engineer-${randomUUID().slice(0, 8)}`,
      departmentId: department.id,
      branchId: branch.id,
      pipelineId: pipeline.id,
      opportunityType: "FULL_TIME",
      workplaceType: "REMOTE",
      openings: 1,
      visibility: "PUBLIC",
    });

    await expect(deleteBranch(membership, branch.id)).rejects.toThrow(BranchInUseError);
  });

  it("deletes an unused branch", async () => {
    const { membership } = await createTestOrgWithOwner();
    const branch = await createBranch(membership, buildInput());

    await deleteBranch(membership, branch.id);

    const found = await prisma.branch.findUnique({ where: { id: branch.id } });
    expect(found?.deletedAt).not.toBeNull();
  });
});
