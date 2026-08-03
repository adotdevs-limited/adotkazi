import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/storage", () => ({
  storageProvider: {
    upload: vi.fn(async (input: { filename: string }) => ({
      path: `organizations/test/documents/${input.filename}`,
    })),
    getSignedUrl: vi.fn(async () => "https://example.com/signed"),
    delete: vi.fn(async () => undefined),
  },
}));

import { prisma } from "@/lib/db";
import {
  loadActiveMembership,
  ForbiddenError,
  type ActiveMembership,
} from "@/domains/platform/authorization/policy";
import { createOrganization } from "@/domains/platform/organizations/organization.service";
import type { CreateOpportunityInput } from "@/domains/recruitment/opportunities/opportunity.schema";
import { createOpportunity, publishOpportunity } from "@/domains/recruitment/opportunities/opportunity.service";
import { listStagesForPipeline } from "@/domains/recruitment/pipelines/pipeline.repository";
import { listApplicationsForCandidate } from "./application.repository";
import {
  AlreadyAppliedError,
  InvalidPipelineStageError,
  OpportunityNotAcceptingApplicationsError,
  moveApplicationStage,
  reactivateApplication,
  rejectApplication,
  submitApplication,
} from "./application.service";

/**
 * Integration test: exercises the real application service against the
 * disposable test database (.env.test). Only the storage provider is
 * mocked — resume upload is an infrastructure detail already covered by
 * src/lib/storage's own provider tests.
 */
describe("application.service", () => {
  const createdUserIds: string[] = [];
  const createdOrganizationIds: string[] = [];

  afterAll(async () => {
    await prisma.application.deleteMany({
      where: { organizationId: { in: createdOrganizationIds } },
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
      data: { id: randomUUID(), name: "Test Candidate", email: `test-${randomUUID()}@example.com` },
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

    return { organizationId: org.organizationId, organizationSlug: slug, membership };
  }

  async function createTestDepartment(organizationId: string) {
    return prisma.department.create({
      data: { organizationId, name: `Engineering-${randomUUID().slice(0, 8)}` },
    });
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

  async function createPublishedOpportunity(
    organizationId: string,
    membership: ActiveMembership,
    overrides: Partial<CreateOpportunityInput> = {},
  ) {
    const department = await createTestDepartment(organizationId);
    const opportunity = await createOpportunity(membership, buildCreateInput(department.id, overrides));
    return publishOpportunity(membership, opportunity.id);
  }

  function resumeFile() {
    return new File([new Uint8Array(1024)], "resume.pdf", { type: "application/pdf" });
  }

  /** A membership with only Viewer-level permissions (application.view, no application.update). */
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

  async function submitTestApplication(
    organizationSlug: string,
    opportunitySlug: string,
    applicant: { id: string; name: string; email: string },
  ) {
    return submitApplication(
      { id: applicant.id, name: applicant.name, email: applicant.email, image: null },
      { organizationSlug, opportunitySlug, resumeFile: resumeFile() },
    );
  }

  it("creates a Candidate and Application on first submission", async () => {
    const { organizationId, organizationSlug, membership } = await createTestOrgWithOwner();
    const opportunity = await createPublishedOpportunity(organizationId, membership);
    const applicant = await createTestUser();

    const application = await submitApplication(
      { id: applicant.id, name: applicant.name, email: applicant.email, image: null },
      {
        organizationSlug,
        opportunitySlug: opportunity.slug,
        coverNote: "Excited to apply.",
        resumeFile: resumeFile(),
      },
    );

    expect(application.opportunityId).toBe(opportunity.id);

    const candidate = await prisma.candidate.findUnique({ where: { userId: applicant.id } });
    expect(candidate).not.toBeNull();

    const auditEvent = await prisma.auditEvent.findFirst({
      where: { entityType: "Application", entityId: application.id, action: "application.submitted" },
    });
    expect(auditEvent).not.toBeNull();
  });

  it("rejects a second application to the same opportunity", async () => {
    const { organizationId, organizationSlug, membership } = await createTestOrgWithOwner();
    const opportunity = await createPublishedOpportunity(organizationId, membership);
    const applicant = await createTestUser();
    const user = { id: applicant.id, name: applicant.name, email: applicant.email, image: null };
    const input = { organizationSlug, opportunitySlug: opportunity.slug, resumeFile: resumeFile() };

    await submitApplication(user, input);

    await expect(submitApplication(user, { ...input, resumeFile: resumeFile() })).rejects.toThrow(
      AlreadyAppliedError,
    );
  });

  it("rejects applying to a DRAFT opportunity", async () => {
    const { organizationId, organizationSlug, membership } = await createTestOrgWithOwner();
    const department = await createTestDepartment(organizationId);
    const opportunity = await createOpportunity(membership, buildCreateInput(department.id));
    const applicant = await createTestUser();

    await expect(
      submitApplication(
        { id: applicant.id, name: applicant.name, email: applicant.email, image: null },
        { organizationSlug, opportunitySlug: opportunity.slug, resumeFile: resumeFile() },
      ),
    ).rejects.toThrow(OpportunityNotAcceptingApplicationsError);
  });

  it("rejects applying after the application deadline", async () => {
    const { organizationId, organizationSlug, membership } = await createTestOrgWithOwner();
    const opportunity = await createPublishedOpportunity(organizationId, membership, {
      applicationDeadline: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });
    const applicant = await createTestUser();

    await expect(
      submitApplication(
        { id: applicant.id, name: applicant.name, email: applicant.email, image: null },
        { organizationSlug, opportunitySlug: opportunity.slug, resumeFile: resumeFile() },
      ),
    ).rejects.toThrow(OpportunityNotAcceptingApplicationsError);
  });

  it("assigns the pipeline's first stage on submission", async () => {
    const { organizationId, organizationSlug, membership } = await createTestOrgWithOwner();
    const opportunity = await createPublishedOpportunity(organizationId, membership);
    const applicant = await createTestUser();

    const application = await submitTestApplication(organizationSlug, opportunity.slug, applicant);

    const stages = await listStagesForPipeline(opportunity.pipelineId);
    expect(application.currentStageId).toBe(stages[0]!.id);
  });

  it("moves an application to a different stage in the same pipeline", async () => {
    const { organizationId, organizationSlug, membership } = await createTestOrgWithOwner();
    const opportunity = await createPublishedOpportunity(organizationId, membership);
    const applicant = await createTestUser();
    const application = await submitTestApplication(organizationSlug, opportunity.slug, applicant);

    const stages = await listStagesForPipeline(opportunity.pipelineId);
    const targetStage = stages[1]!;

    const updated = await moveApplicationStage(membership, application.id, targetStage.id);
    expect(updated.currentStageId).toBe(targetStage.id);

    const auditEvent = await prisma.auditEvent.findFirst({
      where: { entityType: "Application", entityId: application.id, action: "application.stage_changed" },
    });
    expect(auditEvent).not.toBeNull();
  });

  it("rejects moving to a stage from a different pipeline", async () => {
    const first = await createTestOrgWithOwner();
    const firstOpportunity = await createPublishedOpportunity(first.organizationId, first.membership);
    const applicant = await createTestUser();
    const application = await submitTestApplication(
      first.organizationSlug,
      firstOpportunity.slug,
      applicant,
    );

    const second = await createTestOrgWithOwner();
    const secondOpportunity = await createPublishedOpportunity(
      second.organizationId,
      second.membership,
    );
    const foreignStages = await listStagesForPipeline(secondOpportunity.pipelineId);

    await expect(
      moveApplicationStage(first.membership, application.id, foreignStages[0]!.id),
    ).rejects.toThrow(InvalidPipelineStageError);
  });

  it("rejects and reactivates an application, auditing each transition", async () => {
    const { organizationId, organizationSlug, membership } = await createTestOrgWithOwner();
    const opportunity = await createPublishedOpportunity(organizationId, membership);
    const applicant = await createTestUser();
    const application = await submitTestApplication(organizationSlug, opportunity.slug, applicant);

    const rejected = await rejectApplication(membership, application.id);
    expect(rejected.status).toBe("REJECTED");

    const reactivated = await reactivateApplication(membership, application.id);
    expect(reactivated.status).toBe("ACTIVE");

    const rejectedEvent = await prisma.auditEvent.findFirst({
      where: { entityType: "Application", entityId: application.id, action: "application.rejected" },
    });
    const reactivatedEvent = await prisma.auditEvent.findFirst({
      where: { entityType: "Application", entityId: application.id, action: "application.reactivated" },
    });
    expect(rejectedEvent).not.toBeNull();
    expect(reactivatedEvent).not.toBeNull();
  });

  it("lists a candidate's own applications across organizations, most recent first", async () => {
    const first = await createTestOrgWithOwner();
    const firstOpportunity = await createPublishedOpportunity(first.organizationId, first.membership);
    const second = await createTestOrgWithOwner();
    const secondOpportunity = await createPublishedOpportunity(
      second.organizationId,
      second.membership,
    );
    const applicant = await createTestUser();

    await submitTestApplication(first.organizationSlug, firstOpportunity.slug, applicant);
    const secondApplication = await submitTestApplication(
      second.organizationSlug,
      secondOpportunity.slug,
      applicant,
    );

    const otherApplicant = await createTestUser();
    await submitTestApplication(first.organizationSlug, firstOpportunity.slug, otherApplicant);

    const applications = await listApplicationsForCandidate(applicant.id);

    expect(applications).toHaveLength(2);
    expect(applications[0]!.id).toBe(secondApplication.id);
    expect(applications.map((application) => application.opportunity.title)).toEqual([
      secondOpportunity.title,
      firstOpportunity.title,
    ]);
    expect(applications[0]!.opportunity.organization.slug).toBe(second.organizationSlug);
  });

  it("throws ForbiddenError when a Viewer tries to move a stage", async () => {
    const { organizationId, organizationSlug, membership } = await createTestOrgWithOwner();
    const opportunity = await createPublishedOpportunity(organizationId, membership);
    const applicant = await createTestUser();
    const application = await submitTestApplication(organizationSlug, opportunity.slug, applicant);
    const viewerMembership = await createViewerMembership(organizationId);

    const stages = await listStagesForPipeline(opportunity.pipelineId);

    await expect(
      moveApplicationStage(viewerMembership, application.id, stages[1]!.id),
    ).rejects.toThrow(ForbiddenError);
  });
});
