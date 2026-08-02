import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { loadActiveMembership, ForbiddenError } from "@/domains/platform/authorization/policy";
import { createOrganization } from "@/domains/platform/organizations/organization.service";
import { createOpportunity } from "@/domains/recruitment/opportunities/opportunity.service";
import { findDefaultPipeline } from "@/domains/recruitment/pipelines/pipeline.repository";
import {
  DepartmentInUseError,
  DepartmentNameTakenError,
  createDepartment,
  deleteDepartment,
  updateDepartment,
} from "./department.service";

/**
 * Integration test: exercises the real department service against the
 * disposable test database — CRUD, the unique-name guard, the in-use
 * delete guard, and permission checks. No Prisma mocking.
 */
describe("department.service", () => {
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

  it("creates a department and records an audit event", async () => {
    const { membership } = await createTestOrgWithOwner();

    const department = await createDepartment(membership, { name: "Engineering" });

    const auditEvent = await prisma.auditEvent.findFirst({
      where: { entityType: "Department", entityId: department.id, action: "department.created" },
    });
    expect(auditEvent).not.toBeNull();
  });

  it("rejects a duplicate department name within the same organization", async () => {
    const { membership } = await createTestOrgWithOwner();
    await createDepartment(membership, { name: "Engineering" });

    await expect(createDepartment(membership, { name: "Engineering" })).rejects.toThrow(
      DepartmentNameTakenError,
    );
  });

  it("throws ForbiddenError without department.manage", async () => {
    const { organizationId } = await createTestOrgWithOwner();
    const viewerMembership = await createViewerMembership(organizationId);

    await expect(createDepartment(viewerMembership, { name: "Nope" })).rejects.toThrow(
      ForbiddenError,
    );
  });

  it("updates a department", async () => {
    const { membership } = await createTestOrgWithOwner();
    const department = await createDepartment(membership, { name: "Old Name" });

    const updated = await updateDepartment(membership, department.id, {
      name: "New Name",
      description: "Updated.",
    });

    expect(updated.name).toBe("New Name");
    expect(updated.description).toBe("Updated.");
  });

  it("prevents deleting a department used by an opportunity", async () => {
    const { organizationId, membership } = await createTestOrgWithOwner();
    const department = await createDepartment(membership, { name: "Engineering" });
    const pipeline = await findDefaultPipeline(organizationId);
    if (!pipeline) throw new Error("Expected a default pipeline.");

    await createOpportunity(membership, {
      title: "Software Engineer",
      slug: `software-engineer-${randomUUID().slice(0, 8)}`,
      departmentId: department.id,
      pipelineId: pipeline.id,
      opportunityType: "FULL_TIME",
      workplaceType: "REMOTE",
      openings: 1,
      visibility: "PUBLIC",
    });

    await expect(deleteDepartment(membership, department.id)).rejects.toThrow(
      DepartmentInUseError,
    );
  });

  it("deletes an unused department", async () => {
    const { membership } = await createTestOrgWithOwner();
    const department = await createDepartment(membership, { name: "Engineering" });

    await deleteDepartment(membership, department.id);

    const found = await prisma.department.findUnique({ where: { id: department.id } });
    expect(found?.deletedAt).not.toBeNull();
  });
});
