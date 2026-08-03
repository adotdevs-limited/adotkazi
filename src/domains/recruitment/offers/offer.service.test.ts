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

vi.mock("@/lib/email/send-email", () => ({
  sendEmail: vi.fn(async () => undefined),
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
import { sendEmail } from "@/lib/email/send-email";
import {
  OfferAlreadyActiveError,
  OfferExpiredError,
  OfferNotActionableError,
  OfferNotFoundError,
  acceptOffer,
  declineOffer,
  extendOffer,
  getOfferForCandidate,
  withdrawOffer,
} from "./offer.service";

/**
 * Integration test: exercises the real offer service against the disposable
 * test database. Storage and email are mocked (uploads/sends aren't what's
 * under test, and Resend rejects @example.com recipients used here).
 */
describe("offer.service", () => {
  const createdUserIds: string[] = [];
  const createdOrganizationIds: string[] = [];

  afterAll(async () => {
    await prisma.offer.deleteMany({
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

  it("sends an offer, emails the candidate, and audits the event", async () => {
    const org = await createTestOrgWithOwner();
    const { membership } = org;
    const { application } = await createApplicationForNewCandidate(org);

    const offer = await extendOffer(membership, application.id, {
      salary: 120000,
      currency: "USD",
    });

    expect(offer.status).toBe("SENT");
    expect(offer.applicationId).toBe(application.id);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringContaining("offer") }),
    );

    const auditEvent = await prisma.auditEvent.findFirst({
      where: { entityType: "Offer", entityId: offer.id, action: "offer.sent" },
    });
    expect(auditEvent).not.toBeNull();
  });

  it("rejects extending a second active offer to the same application", async () => {
    const org = await createTestOrgWithOwner();
    const { membership } = org;
    const { application } = await createApplicationForNewCandidate(org);

    await extendOffer(membership, application.id, {});

    await expect(extendOffer(membership, application.id, {})).rejects.toThrow(
      OfferAlreadyActiveError,
    );
  });

  it("throws ForbiddenError when a Viewer tries to extend an offer", async () => {
    const org = await createTestOrgWithOwner();
    const { application } = await createApplicationForNewCandidate(org);

    const viewerRole = await prisma.role.findFirstOrThrow({
      where: { name: "Viewer", organizationId: null },
    });
    const viewerUser = await createTestUser();
    await prisma.membership.create({
      data: {
        organizationId: org.organizationId,
        userId: viewerUser.id,
        roleId: viewerRole.id,
        status: "ACTIVE",
        joinedAt: new Date(),
        lastActiveAt: new Date(),
      },
    });
    const viewerMembership = await loadActiveMembership(viewerUser.id, org.organizationId);
    if (!viewerMembership) throw new Error("Expected an active Viewer membership.");

    await expect(extendOffer(viewerMembership, application.id, {})).rejects.toThrow(ForbiddenError);
  });

  it("withdraws a sent offer", async () => {
    const org = await createTestOrgWithOwner();
    const { membership } = org;
    const { application } = await createApplicationForNewCandidate(org);
    const offer = await extendOffer(membership, application.id, {});

    const withdrawn = await withdrawOffer(membership, offer.id);
    expect(withdrawn.status).toBe("WITHDRAWN");
    expect(withdrawn.withdrawnAt).not.toBeNull();

    await expect(withdrawOffer(membership, offer.id)).rejects.toThrow(OfferNotActionableError);
  });

  it("accepts an offer and marks the application HIRED", async () => {
    const org = await createTestOrgWithOwner();
    const { membership } = org;
    const { application, applicant } = await createApplicationForNewCandidate(org);
    const offer = await extendOffer(membership, application.id, { salary: 90000 });
    const applicantUser = { id: applicant.id, name: applicant.name, email: applicant.email, image: null };

    const accepted = await acceptOffer(applicantUser, offer.id);
    expect(accepted.status).toBe("ACCEPTED");
    expect(accepted.acceptedAt).not.toBeNull();

    const updatedApplication = await prisma.application.findUniqueOrThrow({
      where: { id: application.id },
    });
    expect(updatedApplication.status).toBe("HIRED");

    const auditEvent = await prisma.auditEvent.findFirst({
      where: { entityType: "Offer", entityId: offer.id, action: "offer.accepted" },
    });
    expect(auditEvent).not.toBeNull();
  });

  it("declines an offer without changing the application status", async () => {
    const org = await createTestOrgWithOwner();
    const { membership } = org;
    const { application, applicant } = await createApplicationForNewCandidate(org);
    const offer = await extendOffer(membership, application.id, {});
    const applicantUser = { id: applicant.id, name: applicant.name, email: applicant.email, image: null };

    const declined = await declineOffer(applicantUser, offer.id);
    expect(declined.status).toBe("DECLINED");

    const updatedApplication = await prisma.application.findUniqueOrThrow({
      where: { id: application.id },
    });
    expect(updatedApplication.status).toBe("ACTIVE");
  });

  it("rejects responding to an offer that belongs to a different candidate", async () => {
    const org = await createTestOrgWithOwner();
    const { membership } = org;
    const { application } = await createApplicationForNewCandidate(org);
    const offer = await extendOffer(membership, application.id, {});
    const stranger = await createTestUser();

    await expect(
      acceptOffer({ id: stranger.id, name: stranger.name, email: stranger.email, image: null }, offer.id),
    ).rejects.toThrow(OfferNotFoundError);
  });

  it("marks an offer expired and rejects the response when past its expiry", async () => {
    const org = await createTestOrgWithOwner();
    const { membership } = org;
    const { application, applicant } = await createApplicationForNewCandidate(org);
    const offer = await extendOffer(membership, application.id, {
      expiresAt: new Date(Date.now() + 60_000),
    });
    await prisma.offer.update({
      where: { id: offer.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    const applicantUser = { id: applicant.id, name: applicant.name, email: applicant.email, image: null };

    await expect(acceptOffer(applicantUser, offer.id)).rejects.toThrow(OfferExpiredError);

    const expired = await prisma.offer.findUniqueOrThrow({ where: { id: offer.id } });
    expect(expired.status).toBe("EXPIRED");
  });

  it("lets a candidate load their own offer for an application", async () => {
    const org = await createTestOrgWithOwner();
    const { membership } = org;
    const { application, applicant } = await createApplicationForNewCandidate(org);
    await extendOffer(membership, application.id, { salary: 50000, currency: "KES" });
    const applicantUser = { id: applicant.id, name: applicant.name, email: applicant.email, image: null };

    const result = await getOfferForCandidate(applicantUser, application.id);
    expect(result.offer?.salary?.toNumber()).toBe(50000);
    expect(result.application.id).toBe(application.id);
  });
});
