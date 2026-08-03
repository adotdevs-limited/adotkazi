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
import { loadActiveMembership, type ActiveMembership } from "@/domains/platform/authorization/policy";
import { createOrganization } from "@/domains/platform/organizations/organization.service";
import type { CreateOpportunityInput } from "@/domains/recruitment/opportunities/opportunity.schema";
import { createOpportunity, publishOpportunity } from "@/domains/recruitment/opportunities/opportunity.service";
import {
  submitApplication,
  ApplicationNotFoundError,
} from "@/domains/recruitment/applications/application.service";
import { addNote } from "./note.service";
import { listNotesForApplication } from "./note.repository";

/**
 * Integration test: exercises the real note service against the disposable
 * test database. Storage is mocked (uploads aren't what's under test);
 * applications need a real resume upload to be created via submitApplication.
 */
describe("note.service", () => {
  const createdUserIds: string[] = [];
  const createdOrganizationIds: string[] = [];

  afterAll(async () => {
    await prisma.applicationNote.deleteMany({
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

  it("lets an org member with application.view leave a note", async () => {
    const org = await createTestOrgWithOwner();
    const { application } = await createApplicationForNewCandidate(org);
    const interviewerMembership = await createMembershipWithRole(org.organizationId, "Interviewer");

    const note = await addNote(interviewerMembership, application.id, {
      body: "Strong communicator, follow up on availability.",
    });
    expect(note.applicationId).toBe(application.id);
    expect(note.authorMembershipId).toBe(interviewerMembership.membershipId);

    const notes = await listNotesForApplication(application.id);
    expect(notes).toHaveLength(1);
    expect(notes[0]!.author.user.name).toBe("Test User");
  });

  it("orders notes oldest first and preserves each author", async () => {
    const org = await createTestOrgWithOwner();
    const { application } = await createApplicationForNewCandidate(org);
    const second = await createMembershipWithRole(org.organizationId, "Recruiter");

    await addNote(org.membership, application.id, { body: "First note." });
    await addNote(second, application.id, { body: "Second note." });

    const notes = await listNotesForApplication(application.id);
    expect(notes.map((note) => note.body)).toEqual(["First note.", "Second note."]);
    expect(notes[0]!.authorMembershipId).toBe(org.membership.membershipId);
    expect(notes[1]!.authorMembershipId).toBe(second.membershipId);
  });

  it("rejects a note for an application outside the membership's organization", async () => {
    const orgA = await createTestOrgWithOwner();
    const orgB = await createTestOrgWithOwner();
    const { application } = await createApplicationForNewCandidate(orgA);

    await expect(addNote(orgB.membership, application.id, { body: "Hi" })).rejects.toThrow(
      ApplicationNotFoundError,
    );
  });
});
