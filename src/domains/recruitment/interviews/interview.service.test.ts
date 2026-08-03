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
import { ApplicationNotFoundError } from "@/domains/recruitment/applications/application.service";
import {
  FeedbackAlreadySubmittedError,
  InterviewNotActionableError,
  InvalidInterviewerError,
  NotAnInterviewerError,
  cancelInterview,
  completeInterview,
  getInterviewsForCandidate,
  scheduleInterview,
  submitInterviewFeedback,
} from "./interview.service";

/**
 * Integration test: exercises the real interview service against the
 * disposable test database. Storage is mocked (uploads aren't what's under
 * test); applications need a real resume upload to be created via
 * submitApplication.
 */
describe("interview.service", () => {
  const createdUserIds: string[] = [];
  const createdOrganizationIds: string[] = [];

  afterAll(async () => {
    await prisma.interview.deleteMany({
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

  async function createApplicationForNewCandidate(org: {
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
      },
    );
    return { application, applicant };
  }

  function scheduleInput(interviewerMembershipIds: string[]) {
    return {
      interviewType: "VIDEO" as const,
      scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
      scheduledEnd: new Date(Date.now() + 25 * 60 * 60 * 1000),
      meetingLink: "https://meet.example.com/abc",
      interviewerMembershipIds,
    };
  }

  it("schedules an interview with assigned interviewers and audits the event", async () => {
    const org = await createTestOrgWithOwner();
    const { application } = await createApplicationForNewCandidate(org);

    const interview = await scheduleInterview(
      org.membership,
      application.id,
      scheduleInput([org.membership.membershipId]),
    );

    expect(interview.status).toBe("SCHEDULED");
    expect(interview.applicationId).toBe(application.id);

    const auditEvent = await prisma.auditEvent.findFirst({
      where: { entityType: "Interview", entityId: interview.id, action: "interview.scheduled" },
    });
    expect(auditEvent).not.toBeNull();
  });

  it("rejects scheduling with an interviewer outside the organization", async () => {
    const org = await createTestOrgWithOwner();
    const { application } = await createApplicationForNewCandidate(org);
    const stranger = await createTestUser();

    await expect(
      scheduleInterview(org.membership, application.id, scheduleInput([stranger.id])),
    ).rejects.toThrow(InvalidInterviewerError);
  });

  it("throws ForbiddenError when an Interviewer tries to schedule", async () => {
    const org = await createTestOrgWithOwner();
    const { application } = await createApplicationForNewCandidate(org);
    const interviewerMembership = await createMembershipWithRole(org.organizationId, "Interviewer");

    await expect(
      scheduleInterview(interviewerMembership, application.id, scheduleInput([org.membership.membershipId])),
    ).rejects.toThrow(ForbiddenError);
  });

  it("cancels a scheduled interview and rejects acting on it again", async () => {
    const org = await createTestOrgWithOwner();
    const { application } = await createApplicationForNewCandidate(org);
    const interview = await scheduleInterview(
      org.membership,
      application.id,
      scheduleInput([org.membership.membershipId]),
    );

    const cancelled = await cancelInterview(org.membership, interview.id);
    expect(cancelled.status).toBe("CANCELLED");

    await expect(cancelInterview(org.membership, interview.id)).rejects.toThrow(
      InterviewNotActionableError,
    );
  });

  it("marks an interview completed", async () => {
    const org = await createTestOrgWithOwner();
    const { application } = await createApplicationForNewCandidate(org);
    const interview = await scheduleInterview(
      org.membership,
      application.id,
      scheduleInput([org.membership.membershipId]),
    );

    const completed = await completeInterview(org.membership, interview.id);
    expect(completed.status).toBe("COMPLETED");
  });

  it("lets an assigned interviewer submit feedback exactly once", async () => {
    const org = await createTestOrgWithOwner();
    const { application } = await createApplicationForNewCandidate(org);
    const interviewerMembership = await createMembershipWithRole(org.organizationId, "Interviewer");
    const interview = await scheduleInterview(
      org.membership,
      application.id,
      scheduleInput([interviewerMembership.membershipId]),
    );

    const feedback = await submitInterviewFeedback(interviewerMembership, interview.id, {
      recommendation: "YES",
      comments: "Solid technical answers.",
    });
    expect(feedback.recommendation).toBe("YES");

    const auditEvent = await prisma.auditEvent.findFirst({
      where: {
        entityType: "InterviewFeedback",
        entityId: feedback.id,
        action: "interview_feedback.submitted",
      },
    });
    expect(auditEvent).not.toBeNull();

    await expect(
      submitInterviewFeedback(interviewerMembership, interview.id, { recommendation: "NO" }),
    ).rejects.toThrow(FeedbackAlreadySubmittedError);
  });

  it("returns candidate-safe interview fields, excluding feedback and interviewers", async () => {
    const org = await createTestOrgWithOwner();
    const { application, applicant } = await createApplicationForNewCandidate(org);
    const interviewerMembership = await createMembershipWithRole(org.organizationId, "Interviewer");
    const scheduled = await scheduleInterview(
      org.membership,
      application.id,
      scheduleInput([interviewerMembership.membershipId]),
    );
    await submitInterviewFeedback(interviewerMembership, scheduled.id, { recommendation: "YES" });

    const { interviews } = await getInterviewsForCandidate(
      { id: applicant.id, name: applicant.name, email: applicant.email, image: null },
      application.id,
    );

    expect(interviews).toHaveLength(1);
    expect(interviews[0]!.id).toBe(scheduled.id);
    expect(interviews[0]!.meetingLink).toBe("https://meet.example.com/abc");
    expect(interviews[0]).not.toHaveProperty("feedback");
    expect(interviews[0]).not.toHaveProperty("interviewers");
  });

  it("rejects reading another candidate's interviews", async () => {
    const org = await createTestOrgWithOwner();
    const { application } = await createApplicationForNewCandidate(org);
    await scheduleInterview(org.membership, application.id, scheduleInput([org.membership.membershipId]));

    const intruder = await createTestUser();

    await expect(
      getInterviewsForCandidate(
        { id: intruder.id, name: intruder.name, email: intruder.email, image: null },
        application.id,
      ),
    ).rejects.toThrow(ApplicationNotFoundError);
  });

  it("rejects feedback from someone not assigned to the interview", async () => {
    const org = await createTestOrgWithOwner();
    const { application } = await createApplicationForNewCandidate(org);
    const outsiderInterviewer = await createMembershipWithRole(org.organizationId, "Interviewer");
    const interview = await scheduleInterview(
      org.membership,
      application.id,
      scheduleInput([org.membership.membershipId]),
    );

    await expect(
      submitInterviewFeedback(outsiderInterviewer, interview.id, { recommendation: "YES" }),
    ).rejects.toThrow(NotAnInterviewerError);
  });
});
