import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { loadActiveMembership, ForbiddenError } from "@/domains/platform/authorization/policy";
import { createOrganization } from "@/domains/platform/organizations/organization.service";
import { createOpportunity } from "@/domains/recruitment/opportunities/opportunity.service";
import { listStagesForPipeline } from "./pipeline.repository";
import {
  CannotDeleteDefaultPipelineError,
  CannotDeleteSystemPipelineError,
  PipelineInUseError,
  PipelineNameTakenError,
  StageInUseError,
  createPipeline,
  createPipelineStage,
  deletePipeline,
  deletePipelineStage,
  getPipelineDetail,
  movePipelineStage,
  setDefaultPipeline,
  updatePipeline,
  updatePipelineStage,
} from "./pipeline.service";

/**
 * Integration test: exercises the real pipeline service against the
 * disposable test database (.env.test) — CRUD, ordering, the delete
 * guards (system/default/in-use pipelines, in-use stages), and permission
 * checks. No Prisma mocking.
 */
describe("pipeline.service", () => {
  const createdUserIds: string[] = [];
  const createdOrganizationIds: string[] = [];

  afterAll(async () => {
    await prisma.application.deleteMany({
      where: { opportunity: { organizationId: { in: createdOrganizationIds } } },
    });
    await prisma.candidate.deleteMany({ where: { userId: { in: createdUserIds } } });
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

  /** New org + Owner membership (Owner carries pipeline.manage). */
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

  it("creates a pipeline and records an audit event", async () => {
    const { membership } = await createTestOrgWithOwner();

    const pipeline = await createPipeline(membership, { name: "Design Pipeline" });

    expect(pipeline.isDefault).toBe(false);
    expect(pipeline.isSystem).toBe(false);

    const auditEvent = await prisma.auditEvent.findFirst({
      where: { entityType: "Pipeline", entityId: pipeline.id, action: "pipeline.created" },
    });
    expect(auditEvent).not.toBeNull();
  });

  it("rejects a duplicate pipeline name within the same organization", async () => {
    const { membership } = await createTestOrgWithOwner();
    await createPipeline(membership, { name: "Design Pipeline" });

    await expect(createPipeline(membership, { name: "Design Pipeline" })).rejects.toThrow(
      PipelineNameTakenError,
    );
  });

  it("allows the same pipeline name across different organizations", async () => {
    const first = await createTestOrgWithOwner();
    const second = await createTestOrgWithOwner();

    await createPipeline(first.membership, { name: "Shared Name" });

    await expect(
      createPipeline(second.membership, { name: "Shared Name" }),
    ).resolves.toMatchObject({ name: "Shared Name" });
  });

  it("throws ForbiddenError without pipeline.manage", async () => {
    const { organizationId } = await createTestOrgWithOwner();
    const viewerMembership = await createViewerMembership(organizationId);

    await expect(createPipeline(viewerMembership, { name: "Nope" })).rejects.toThrow(
      ForbiddenError,
    );
  });

  it("updates a pipeline's name and description", async () => {
    const { membership } = await createTestOrgWithOwner();
    const pipeline = await createPipeline(membership, { name: "Old Name" });

    const updated = await updatePipeline(membership, pipeline.id, {
      name: "New Name",
      description: "Updated.",
    });

    expect(updated.name).toBe("New Name");
    expect(updated.description).toBe("Updated.");
  });

  it("appends new stages in order, starting from an empty pipeline", async () => {
    const { membership } = await createTestOrgWithOwner();
    const pipeline = await createPipeline(membership, { name: "Design Pipeline" });

    const first = await createPipelineStage(membership, pipeline.id, {
      name: "Applied",
      isTerminal: false,
      allowsFeedback: true,
    });
    const second = await createPipelineStage(membership, pipeline.id, {
      name: "Interview",
      isTerminal: false,
      allowsFeedback: true,
    });

    expect(first.order).toBe(0);
    expect(second.order).toBe(1);
  });

  it("updates a stage", async () => {
    const { membership } = await createTestOrgWithOwner();
    const pipeline = await createPipeline(membership, { name: "Design Pipeline" });
    const stage = await createPipelineStage(membership, pipeline.id, {
      name: "Applied",
      isTerminal: false,
      allowsFeedback: true,
    });

    const updated = await updatePipelineStage(membership, pipeline.id, stage.id, {
      name: "Screened",
      isTerminal: true,
      allowsFeedback: false,
    });

    expect(updated.name).toBe("Screened");
    expect(updated.isTerminal).toBe(true);
    expect(updated.allowsFeedback).toBe(false);
  });

  it("reorders stages with movePipelineStage, and no-ops at the boundary", async () => {
    const { membership } = await createTestOrgWithOwner();
    const pipeline = await createPipeline(membership, { name: "Design Pipeline" });
    const a = await createPipelineStage(membership, pipeline.id, {
      name: "A",
      isTerminal: false,
      allowsFeedback: true,
    });
    const b = await createPipelineStage(membership, pipeline.id, {
      name: "B",
      isTerminal: false,
      allowsFeedback: true,
    });

    await movePipelineStage(membership, pipeline.id, b.id, "up");

    const stages = await listStagesForPipeline(pipeline.id);
    expect(stages.map((s) => s.id)).toEqual([b.id, a.id]);

    // "B" is now first — moving it up again should be a no-op, not throw.
    await expect(movePipelineStage(membership, pipeline.id, b.id, "up")).resolves.toBeUndefined();
    const unchanged = await listStagesForPipeline(pipeline.id);
    expect(unchanged.map((s) => s.id)).toEqual([b.id, a.id]);
  });

  it("prevents deleting a stage that applications currently reference", async () => {
    const { organizationId, membership } = await createTestOrgWithOwner();
    const department = await prisma.department.create({
      data: { organizationId, name: `Engineering-${randomUUID().slice(0, 8)}` },
    });
    const pipeline = await createPipeline(membership, { name: "Design Pipeline" });
    const stage = await createPipelineStage(membership, pipeline.id, {
      name: "Applied",
      isTerminal: false,
      allowsFeedback: true,
    });
    const opportunity = await createOpportunity(membership, {
      title: "Product Designer",
      slug: `product-designer-${randomUUID().slice(0, 8)}`,
      departmentId: department.id,
      pipelineId: pipeline.id,
      opportunityType: "FULL_TIME",
      workplaceType: "REMOTE",
      openings: 1,
      visibility: "PUBLIC",
    });
    const candidateUser = await createTestUser();
    const candidate = await prisma.candidate.create({ data: { userId: candidateUser.id } });
    await prisma.application.create({
      data: {
        organizationId,
        opportunityId: opportunity.id,
        candidateId: candidate.id,
        currentStageId: stage.id,
        resumeFilename: "resume.pdf",
        resumeStoragePath: "test/resume.pdf",
      },
    });

    await expect(deletePipelineStage(membership, pipeline.id, stage.id)).rejects.toThrow(
      StageInUseError,
    );
  });

  it("deletes a stage with no applications", async () => {
    const { membership } = await createTestOrgWithOwner();
    const pipeline = await createPipeline(membership, { name: "Design Pipeline" });
    const stage = await createPipelineStage(membership, pipeline.id, {
      name: "Applied",
      isTerminal: false,
      allowsFeedback: true,
    });

    await deletePipelineStage(membership, pipeline.id, stage.id);

    const stages = await listStagesForPipeline(pipeline.id);
    expect(stages).toHaveLength(0);
  });

  it("prevents deleting the org's system pipeline", async () => {
    const { membership } = await createTestOrgWithOwner();
    const systemPipeline = await prisma.pipeline.findFirstOrThrow({
      where: { organizationId: membership.organizationId, isSystem: true },
    });

    await expect(deletePipeline(membership, systemPipeline.id)).rejects.toThrow(
      CannotDeleteSystemPipelineError,
    );

    const detail = await getPipelineDetail(membership, systemPipeline.id);
    expect(detail.pipeline.id).toBe(systemPipeline.id);
  });

  it("prevents deleting the default pipeline", async () => {
    const { membership } = await createTestOrgWithOwner();
    const pipeline = await createPipeline(membership, { name: "Design Pipeline" });
    await setDefaultPipeline(membership, pipeline.id);

    await expect(deletePipeline(membership, pipeline.id)).rejects.toThrow(
      CannotDeleteDefaultPipelineError,
    );
  });

  it("prevents deleting a pipeline used by an opportunity", async () => {
    const { organizationId, membership } = await createTestOrgWithOwner();
    const department = await prisma.department.create({
      data: { organizationId, name: `Engineering-${randomUUID().slice(0, 8)}` },
    });
    const pipeline = await createPipeline(membership, { name: "Design Pipeline" });
    await createOpportunity(membership, {
      title: "Product Designer",
      slug: `product-designer-${randomUUID().slice(0, 8)}`,
      departmentId: department.id,
      pipelineId: pipeline.id,
      opportunityType: "FULL_TIME",
      workplaceType: "REMOTE",
      openings: 1,
      visibility: "PUBLIC",
    });

    await expect(deletePipeline(membership, pipeline.id)).rejects.toThrow(PipelineInUseError);
  });

  it("deletes an unused, non-default, non-system pipeline", async () => {
    const { membership } = await createTestOrgWithOwner();
    const pipeline = await createPipeline(membership, { name: "Design Pipeline" });

    await deletePipeline(membership, pipeline.id);

    const found = await prisma.pipeline.findUnique({ where: { id: pipeline.id } });
    expect(found?.deletedAt).not.toBeNull();
  });

  it("setDefaultPipeline swaps the default flag to exactly one pipeline", async () => {
    const { membership } = await createTestOrgWithOwner();
    const systemPipeline = await prisma.pipeline.findFirstOrThrow({
      where: { organizationId: membership.organizationId, isSystem: true },
    });
    const pipeline = await createPipeline(membership, { name: "Design Pipeline" });

    await setDefaultPipeline(membership, pipeline.id);

    const defaults = await prisma.pipeline.findMany({
      where: { organizationId: membership.organizationId, isDefault: true },
    });
    expect(defaults.map((p) => p.id)).toEqual([pipeline.id]);

    const oldDefault = await prisma.pipeline.findUnique({ where: { id: systemPipeline.id } });
    expect(oldDefault?.isDefault).toBe(false);
  });
});
