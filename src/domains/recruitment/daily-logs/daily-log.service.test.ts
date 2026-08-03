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
import { submitApplication } from "@/domains/recruitment/applications/application.service";
import {
  activatePlacement,
  approvePlacement,
  assignSupervisor,
  createPlacement,
  PlacementNotFoundError,
} from "@/domains/recruitment/placements/placement.service";
import {
  DailyLogAlreadySubmittedError,
  DailyLogNotActionableError,
  NotAssignedSupervisorError,
  PlacementNotActiveError,
  approveDailyLog,
  listDailyLogsForCandidatePlacement,
  returnDailyLog,
  submitDailyLog,
} from "./daily-log.service";

/**
 * Integration test: exercises the real daily-log service against the
 * disposable test database. Storage is mocked; applications need a real
 * resume upload to be created via submitApplication.
 */
describe("daily-log.service", () => {
  const createdUserIds: string[] = [];
  const createdOrganizationIds: string[] = [];

  afterAll(async () => {
    await prisma.dailyLog.deleteMany({
      where: { placement: { application: { organizationId: { in: createdOrganizationIds } } } },
    });
    await prisma.placement.deleteMany({
      where: { application: { organizationId: { in: createdOrganizationIds } } },
    });
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

    return { organizationId: org.organizationId, organizationSlug: slug, membership };
  }

  async function createMembershipWithRole(organizationId: string, roleName: string) {
    const role = await prisma.role.findFirstOrThrow({
      where: { name: roleName, organizationId: null },
    });
    const user = await createTestUser();
    await prisma.membership.create({
      data: {
        organizationId,
        userId: user.id,
        roleId: role.id,
        status: "ACTIVE",
        joinedAt: new Date(),
        lastActiveAt: new Date(),
      },
    });
    const membership = await loadActiveMembership(user.id, organizationId);
    if (!membership) throw new Error(`Expected an active ${roleName} membership.`);
    return membership;
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
      title: "IPT Placement",
      slug: `ipt-placement-${randomUUID().slice(0, 8)}`,
      departmentId,
      opportunityType: "INDUSTRIAL_PRACTICAL_TRAINING",
      workplaceType: "ON_SITE",
      openings: 1,
      visibility: "PUBLIC",
      ...overrides,
    };
  }

  async function createActivePlacement(org: {
    organizationId: string;
    organizationSlug: string;
    membership: ActiveMembership;
  }) {
    const department = await createTestDepartment(org.organizationId);
    const opportunity = await publishOpportunity(
      org.membership,
      (await createOpportunity(org.membership, buildCreateInput(department.id))).id,
    );
    const applicant = await createTestUser();
    const application = await submitApplication(
      { id: applicant.id, name: applicant.name, email: applicant.email, image: null },
      {
        organizationSlug: org.organizationSlug,
        opportunitySlug: opportunity.slug,
        resumeFile: new File([new Uint8Array(1024)], "resume.pdf", { type: "application/pdf" }),
        // opportunityType defaults to INDUSTRIAL_PRACTICAL_TRAINING above,
        // which requires these per application.service.ts.
        institution: "University of Dar es Salaam",
        program: "Computer Science",
        levelOfStudy: "Undergraduate",
        yearOfStudy: 3,
        academicTranscriptFile: new File([new Uint8Array(1024)], "transcript.pdf", {
          type: "application/pdf",
        }),
      },
    );

    const placement = await createPlacement(org.membership, application.id, {});
    await approvePlacement(org.membership, placement.id);
    const activated = await activatePlacement(org.membership, placement.id);

    return { placement: activated, application, applicant };
  }

  function studentUser(user: { id: string; name: string; email: string }) {
    return { id: user.id, name: user.name, email: user.email, image: null };
  }

  function logInput(overrides: Partial<Parameters<typeof submitDailyLog>[2]> = {}) {
    return {
      date: new Date("2026-01-15"),
      activityDescription: "Paired on the onboarding flow.",
      skillsLearned: "React, Prisma",
      hoursWorked: 8,
      notes: undefined,
      ...overrides,
    };
  }

  it("submits a daily log for an active placement", async () => {
    const org = await createTestOrgWithOwner();
    const { placement, applicant } = await createActivePlacement(org);

    const log = await submitDailyLog(studentUser(applicant), placement.id, logInput());

    expect(log.status).toBe("SUBMITTED");
    expect(log.placementId).toBe(placement.id);

    const auditEvent = await prisma.auditEvent.findFirst({
      where: { entityType: "DailyLog", entityId: log.id, action: "daily_log.submitted" },
    });
    expect(auditEvent).not.toBeNull();
  });

  it("rejects submitting a log for a non-active placement", async () => {
    const org = await createTestOrgWithOwner();
    const department = await createTestDepartment(org.organizationId);
    const opportunity = await publishOpportunity(
      org.membership,
      (await createOpportunity(org.membership, buildCreateInput(department.id))).id,
    );
    const applicant = await createTestUser();
    const application = await submitApplication(studentUser(applicant), {
      organizationSlug: org.organizationSlug,
      opportunitySlug: opportunity.slug,
      resumeFile: new File([new Uint8Array(1024)], "resume.pdf", { type: "application/pdf" }),
      institution: "University of Dar es Salaam",
      program: "Computer Science",
      levelOfStudy: "Undergraduate",
      yearOfStudy: 3,
      academicTranscriptFile: new File([new Uint8Array(1024)], "transcript.pdf", {
        type: "application/pdf",
      }),
    });
    const pendingPlacement = await createPlacement(org.membership, application.id, {});

    await expect(
      submitDailyLog(studentUser(applicant), pendingPlacement.id, logInput()),
    ).rejects.toThrow(PlacementNotActiveError);
  });

  it("rejects a second submission for the same date while pending review", async () => {
    const org = await createTestOrgWithOwner();
    const { placement, applicant } = await createActivePlacement(org);

    await submitDailyLog(studentUser(applicant), placement.id, logInput());

    await expect(
      submitDailyLog(studentUser(applicant), placement.id, logInput()),
    ).rejects.toThrow(DailyLogAlreadySubmittedError);
  });

  it("allows resubmission after a log is returned, clearing the review", async () => {
    const org = await createTestOrgWithOwner();
    const { placement, applicant } = await createActivePlacement(org);
    const log = await submitDailyLog(studentUser(applicant), placement.id, logInput());
    await returnDailyLog(org.membership, log.id, "Add more detail on the challenges faced.");

    const resubmitted = await submitDailyLog(
      studentUser(applicant),
      placement.id,
      logInput({ activityDescription: "Expanded with more detail." }),
    );

    expect(resubmitted.id).toBe(log.id);
    expect(resubmitted.status).toBe("SUBMITTED");
    expect(resubmitted.reviewComment).toBeNull();
    expect(resubmitted.activityDescription).toBe("Expanded with more detail.");
  });

  it("approves a submitted log and audits the event", async () => {
    const org = await createTestOrgWithOwner();
    const { placement, applicant } = await createActivePlacement(org);
    const log = await submitDailyLog(studentUser(applicant), placement.id, logInput());

    const approved = await approveDailyLog(org.membership, log.id);
    expect(approved.status).toBe("APPROVED");

    const auditEvent = await prisma.auditEvent.findFirst({
      where: { entityType: "DailyLog", entityId: log.id, action: "daily_log.approved" },
    });
    expect(auditEvent).not.toBeNull();

    await expect(approveDailyLog(org.membership, log.id)).rejects.toThrow(
      DailyLogNotActionableError,
    );
  });

  it("returns a submitted log with a comment", async () => {
    const org = await createTestOrgWithOwner();
    const { placement, applicant } = await createActivePlacement(org);
    const log = await submitDailyLog(studentUser(applicant), placement.id, logInput());

    const returned = await returnDailyLog(org.membership, log.id, "Please add more detail.");
    expect(returned.status).toBe("RETURNED");
    expect(returned.reviewComment).toBe("Please add more detail.");
  });

  it("throws ForbiddenError for a role without daily_log.review", async () => {
    const org = await createTestOrgWithOwner();
    const { placement, applicant } = await createActivePlacement(org);
    const log = await submitDailyLog(studentUser(applicant), placement.id, logInput());
    const recruiterMembership = await createMembershipWithRole(org.organizationId, "Recruiter");

    await expect(approveDailyLog(recruiterMembership, log.id)).rejects.toThrow(ForbiddenError);
  });

  it("rejects review from a Supervisor who isn't assigned to this placement", async () => {
    const org = await createTestOrgWithOwner();
    const { placement, applicant } = await createActivePlacement(org);
    const assignedSupervisor = await createMembershipWithRole(org.organizationId, "Supervisor");
    await assignSupervisor(org.membership, placement.id, assignedSupervisor.membershipId);
    const otherSupervisor = await createMembershipWithRole(org.organizationId, "Supervisor");

    const log = await submitDailyLog(studentUser(applicant), placement.id, logInput());

    await expect(approveDailyLog(otherSupervisor, log.id)).rejects.toThrow(
      NotAssignedSupervisorError,
    );

    await expect(approveDailyLog(assignedSupervisor, log.id)).resolves.toMatchObject({
      status: "APPROVED",
    });
  });

  it("lets the student list their own placement's logs, and rejects a stranger", async () => {
    const org = await createTestOrgWithOwner();
    const { placement, applicant } = await createActivePlacement(org);
    await submitDailyLog(studentUser(applicant), placement.id, logInput());

    const logs = await listDailyLogsForCandidatePlacement(studentUser(applicant), placement.id);
    expect(logs).toHaveLength(1);

    const stranger = await createTestUser();
    await expect(
      listDailyLogsForCandidatePlacement(studentUser(stranger), placement.id),
    ).rejects.toThrow(PlacementNotFoundError);
  });
});
