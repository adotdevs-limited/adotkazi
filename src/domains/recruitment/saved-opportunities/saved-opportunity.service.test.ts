import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { loadActiveMembership, type ActiveMembership } from "@/domains/platform/authorization/policy";
import { createOrganization } from "@/domains/platform/organizations/organization.service";
import type { CreateOpportunityInput } from "@/domains/recruitment/opportunities/opportunity.schema";
import {
  createOpportunity,
  publishOpportunity,
} from "@/domains/recruitment/opportunities/opportunity.service";
import { listSavedOpportunitiesForCandidate } from "./saved-opportunity.repository";
import {
  AlreadySavedError,
  OpportunityNotFoundError,
  SavedOpportunityNotFoundError,
  saveOpportunity,
  unsaveOpportunity,
} from "./saved-opportunity.service";

/**
 * Integration test: exercises the real saved-opportunity service against
 * the disposable test database (.env.test). No Prisma mocking.
 */
describe("saved-opportunity.service", () => {
  const createdUserIds: string[] = [];
  const createdOrganizationIds: string[] = [];

  afterAll(async () => {
    await prisma.savedOpportunity.deleteMany({
      where: { candidate: { userId: { in: createdUserIds } } },
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

  function candidateUser(user: { id: string; name: string; email: string }) {
    return { id: user.id, name: user.name, email: user.email, image: null };
  }

  it("creates a Candidate and SavedOpportunity on first save", async () => {
    const { organizationId, organizationSlug, membership } = await createTestOrgWithOwner();
    const opportunity = await createPublishedOpportunity(organizationId, membership);
    const candidateUserRow = await createTestUser();

    const saved = await saveOpportunity(candidateUser(candidateUserRow), {
      organizationSlug,
      opportunitySlug: opportunity.slug,
    });

    expect(saved.opportunityId).toBe(opportunity.id);

    const candidate = await prisma.candidate.findUnique({ where: { userId: candidateUserRow.id } });
    expect(candidate).not.toBeNull();
  });

  it("rejects saving the same opportunity twice", async () => {
    const { organizationId, organizationSlug, membership } = await createTestOrgWithOwner();
    const opportunity = await createPublishedOpportunity(organizationId, membership);
    const candidateUserRow = await createTestUser();
    const input = { organizationSlug, opportunitySlug: opportunity.slug };

    await saveOpportunity(candidateUser(candidateUserRow), input);

    await expect(saveOpportunity(candidateUser(candidateUserRow), input)).rejects.toThrow(
      AlreadySavedError,
    );
  });

  it("rejects saving an opportunity that isn't published", async () => {
    const { organizationId, organizationSlug, membership } = await createTestOrgWithOwner();
    const department = await createTestDepartment(organizationId);
    const opportunity = await createOpportunity(membership, buildCreateInput(department.id));
    const candidateUserRow = await createTestUser();

    await expect(
      saveOpportunity(candidateUser(candidateUserRow), {
        organizationSlug,
        opportunitySlug: opportunity.slug,
      }),
    ).rejects.toThrow(OpportunityNotFoundError);
  });

  it("unsaves an opportunity, and lists only the current candidate's saves", async () => {
    const first = await createTestOrgWithOwner();
    const firstOpportunity = await createPublishedOpportunity(first.organizationId, first.membership);
    const second = await createTestOrgWithOwner();
    const secondOpportunity = await createPublishedOpportunity(
      second.organizationId,
      second.membership,
    );
    const candidateUserRow = await createTestUser();

    await saveOpportunity(candidateUser(candidateUserRow), {
      organizationSlug: first.organizationSlug,
      opportunitySlug: firstOpportunity.slug,
    });
    const secondSave = await saveOpportunity(candidateUser(candidateUserRow), {
      organizationSlug: second.organizationSlug,
      opportunitySlug: secondOpportunity.slug,
    });

    const otherCandidate = await createTestUser();
    await saveOpportunity(candidateUser(otherCandidate), {
      organizationSlug: first.organizationSlug,
      opportunitySlug: firstOpportunity.slug,
    });

    let saves = await listSavedOpportunitiesForCandidate(candidateUserRow.id);
    expect(saves).toHaveLength(2);

    await unsaveOpportunity(candidateUserRow.id, secondSave.id);

    saves = await listSavedOpportunitiesForCandidate(candidateUserRow.id);
    expect(saves).toHaveLength(1);
    expect(saves[0]!.opportunity.title).toBe(firstOpportunity.title);
  });

  it("rejects unsaving another candidate's saved opportunity", async () => {
    const { organizationId, organizationSlug, membership } = await createTestOrgWithOwner();
    const opportunity = await createPublishedOpportunity(organizationId, membership);
    const owner = await createTestUser();
    const saved = await saveOpportunity(candidateUser(owner), {
      organizationSlug,
      opportunitySlug: opportunity.slug,
    });

    const intruder = await createTestUser();

    await expect(unsaveOpportunity(intruder.id, saved.id)).rejects.toThrow(
      SavedOpportunityNotFoundError,
    );
  });
});
