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
import {
  ApplicationNotFoundError,
  rejectApplication,
  submitApplication,
} from "@/domains/recruitment/applications/application.service";
import {
  ApplicationNotActiveError,
  InvalidPlacementStatusTransitionError,
  InvalidSupervisorError,
  NotAssignedSupervisorError,
  PlacementAlreadyExistsError,
  activatePlacement,
  approvePlacement,
  assignSupervisor,
  cancelPlacement,
  completePlacement,
  createPlacement,
  getPlacementForApplication,
  getPlacementForSupervisor,
  getSupervisedPlacements,
  resumePlacement,
  suspendPlacement,
} from "./placement.service";

/**
 * Integration test: exercises the real placement service against the
 * disposable test database. Storage is mocked; applications need a real
 * resume upload to be created via submitApplication.
 */
describe("placement.service", () => {
  const createdUserIds: string[] = [];
  const createdOrganizationIds: string[] = [];

  afterAll(async () => {
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
    return { application, applicant };
  }

  it("creates a placement from an active application, in PENDING status", async () => {
    const org = await createTestOrgWithOwner();
    const { application } = await createApplicationForNewCandidate(org);

    const placement = await createPlacement(org.membership, application.id, {});

    expect(placement.status).toBe("PENDING");
    expect(placement.applicationId).toBe(application.id);

    const auditEvent = await prisma.auditEvent.findFirst({
      where: { entityType: "Placement", entityId: placement.id, action: "placement.created" },
    });
    expect(auditEvent).not.toBeNull();
  });

  it("rejects a second placement for the same application", async () => {
    const org = await createTestOrgWithOwner();
    const { application } = await createApplicationForNewCandidate(org);

    await createPlacement(org.membership, application.id, {});

    await expect(createPlacement(org.membership, application.id, {})).rejects.toThrow(
      PlacementAlreadyExistsError,
    );
  });

  it("rejects placing a non-active application", async () => {
    const org = await createTestOrgWithOwner();
    const { application } = await createApplicationForNewCandidate(org);
    await rejectApplication(org.membership, application.id);

    await expect(createPlacement(org.membership, application.id, {})).rejects.toThrow(
      ApplicationNotActiveError,
    );
  });

  it("walks the full lifecycle: pending -> approved -> active -> completed", async () => {
    const org = await createTestOrgWithOwner();
    const { application } = await createApplicationForNewCandidate(org);
    const placement = await createPlacement(org.membership, application.id, {});

    const approved = await approvePlacement(org.membership, placement.id);
    expect(approved.status).toBe("APPROVED");

    const activated = await activatePlacement(org.membership, placement.id);
    expect(activated.status).toBe("ACTIVE");

    const completed = await completePlacement(org.membership, placement.id);
    expect(completed.status).toBe("COMPLETED");
  });

  it("rejects an out-of-order transition", async () => {
    const org = await createTestOrgWithOwner();
    const { application } = await createApplicationForNewCandidate(org);
    const placement = await createPlacement(org.membership, application.id, {});

    await expect(activatePlacement(org.membership, placement.id)).rejects.toThrow(
      InvalidPlacementStatusTransitionError,
    );
  });

  it("suspends and resumes an active placement", async () => {
    const org = await createTestOrgWithOwner();
    const { application } = await createApplicationForNewCandidate(org);
    const placement = await createPlacement(org.membership, application.id, {});
    await approvePlacement(org.membership, placement.id);
    await activatePlacement(org.membership, placement.id);

    const suspended = await suspendPlacement(org.membership, placement.id);
    expect(suspended.status).toBe("SUSPENDED");

    const resumed = await resumePlacement(org.membership, placement.id);
    expect(resumed.status).toBe("ACTIVE");
  });

  it("cancels a pending placement", async () => {
    const org = await createTestOrgWithOwner();
    const { application } = await createApplicationForNewCandidate(org);
    const placement = await createPlacement(org.membership, application.id, {});

    const cancelled = await cancelPlacement(org.membership, placement.id);
    expect(cancelled.status).toBe("CANCELLED");
  });

  it("assigns a valid supervisor and rejects one outside the organization", async () => {
    const org = await createTestOrgWithOwner();
    const { application } = await createApplicationForNewCandidate(org);
    const placement = await createPlacement(org.membership, application.id, {});
    const supervisorMembership = await createMembershipWithRole(org.organizationId, "Supervisor");

    const updated = await assignSupervisor(org.membership, placement.id, supervisorMembership.membershipId);
    expect(updated.supervisorMembershipId).toBe(supervisorMembership.membershipId);

    const auditEvent = await prisma.auditEvent.findFirst({
      where: {
        entityType: "Placement",
        entityId: placement.id,
        action: "placement.supervisor_assigned",
      },
    });
    expect(auditEvent).not.toBeNull();

    const strangerMembershipId = randomUUID();
    await expect(
      assignSupervisor(org.membership, placement.id, strangerMembershipId),
    ).rejects.toThrow(InvalidSupervisorError);
  });

  it("throws ForbiddenError when a Viewer tries to create a placement", async () => {
    const org = await createTestOrgWithOwner();
    const { application } = await createApplicationForNewCandidate(org);
    const viewerMembership = await createMembershipWithRole(org.organizationId, "Viewer");

    await expect(createPlacement(viewerMembership, application.id, {})).rejects.toThrow(
      ForbiddenError,
    );
  });

  it("lets a Viewer read a placement via placement.view", async () => {
    const org = await createTestOrgWithOwner();
    const { application } = await createApplicationForNewCandidate(org);
    await createPlacement(org.membership, application.id, {});
    const viewerMembership = await createMembershipWithRole(org.organizationId, "Viewer");

    const placement = await getPlacementForApplication(viewerMembership, application.id);
    expect(placement).not.toBeNull();
  });

  it("rejects reading a placement for an application in another organization", async () => {
    const first = await createTestOrgWithOwner();
    const { application } = await createApplicationForNewCandidate(first);
    const second = await createTestOrgWithOwner();

    await expect(getPlacementForApplication(second.membership, application.id)).rejects.toThrow(
      ApplicationNotFoundError,
    );
  });

  it("lists only the placements assigned to the calling supervisor", async () => {
    const org = await createTestOrgWithOwner();
    const supervisorA = await createMembershipWithRole(org.organizationId, "Supervisor");
    const supervisorB = await createMembershipWithRole(org.organizationId, "Supervisor");

    const { application: applicationA } = await createApplicationForNewCandidate(org);
    const placementA = await createPlacement(org.membership, applicationA.id, {});
    await assignSupervisor(org.membership, placementA.id, supervisorA.membershipId);

    const { application: applicationB } = await createApplicationForNewCandidate(org);
    const placementB = await createPlacement(org.membership, applicationB.id, {});
    await assignSupervisor(org.membership, placementB.id, supervisorB.membershipId);

    const supervisedByA = await getSupervisedPlacements(supervisorA);
    expect(supervisedByA).toHaveLength(1);
    expect(supervisedByA[0]?.id).toBe(placementA.id);
    expect(supervisedByA[0]?.application.opportunity.title).toBe("IPT Placement");
  });

  it("lets the assigned supervisor read their own placement detail, and rejects a different supervisor", async () => {
    const org = await createTestOrgWithOwner();
    const assignedSupervisor = await createMembershipWithRole(org.organizationId, "Supervisor");
    const otherSupervisor = await createMembershipWithRole(org.organizationId, "Supervisor");

    const { application } = await createApplicationForNewCandidate(org);
    const placement = await createPlacement(org.membership, application.id, {});
    await assignSupervisor(org.membership, placement.id, assignedSupervisor.membershipId);

    const detail = await getPlacementForSupervisor(assignedSupervisor, placement.id);
    expect(detail.id).toBe(placement.id);

    await expect(getPlacementForSupervisor(otherSupervisor, placement.id)).rejects.toThrow(
      NotAssignedSupervisorError,
    );

    const adminDetail = await getPlacementForSupervisor(org.membership, placement.id);
    expect(adminDetail.id).toBe(placement.id);
  });
});
