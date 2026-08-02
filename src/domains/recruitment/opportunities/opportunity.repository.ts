import "server-only";

import type {
  ExperienceLevel,
  OpportunityStatus,
  OpportunityType,
  OpportunityVisibility,
  Prisma,
  WorkplaceType,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export function findOpportunityById(id: string, organizationId: string) {
  return prisma.opportunity.findFirst({
    where: { id, organizationId, deletedAt: null },
    include: {
      department: true,
      branch: true,
      pipeline: true,
      skillRequirements: { include: { skill: true } },
    },
  });
}

export async function isOpportunitySlugTaken(
  organizationId: string,
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  const opportunity = await prisma.opportunity.findFirst({
    where: { organizationId, slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  return opportunity !== null;
}

export function listOpportunitiesForOrganization(
  organizationId: string,
  filters?: { status?: OpportunityStatus },
) {
  return prisma.opportunity.findMany({
    where: {
      organizationId,
      deletedAt: null,
      ...(filters?.status ? { status: filters.status } : {}),
    },
    include: { department: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

/** Candidate-facing listing — PUBLISHED + PUBLIC only. See careers/[orgSlug]. */
export function listPublicOpportunitiesForOrganization(
  organizationId: string,
  filters?: {
    opportunityType?: OpportunityType;
    workplaceType?: WorkplaceType;
    departmentId?: string;
    q?: string;
  },
) {
  return prisma.opportunity.findMany({
    where: {
      organizationId,
      status: "PUBLISHED",
      visibility: "PUBLIC",
      deletedAt: null,
      ...(filters?.opportunityType ? { opportunityType: filters.opportunityType } : {}),
      ...(filters?.workplaceType ? { workplaceType: filters.workplaceType } : {}),
      ...(filters?.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters?.q ? { title: { contains: filters.q, mode: "insensitive" } } : {}),
    },
    include: { department: true },
    orderBy: [{ publishAt: "desc" }, { createdAt: "desc" }],
    take: 100,
  });
}

/** Candidate-facing detail lookup — same PUBLISHED + PUBLIC guard as the list above. */
export function findPublicOpportunityBySlug(organizationId: string, slug: string) {
  return prisma.opportunity.findFirst({
    where: {
      organizationId,
      slug,
      status: "PUBLISHED",
      visibility: "PUBLIC",
      deletedAt: null,
    },
    include: {
      department: true,
      skillRequirements: { include: { skill: true } },
    },
  });
}

export type CreateOpportunityData = {
  organizationId: string;
  departmentId: string;
  branchId?: string;
  hiringTeamId?: string;
  pipelineId: string;
  title: string;
  slug: string;
  description?: string;
  responsibilities?: string;
  requirements?: string;
  benefits?: string;
  opportunityType: OpportunityType;
  workplaceType: WorkplaceType;
  experienceLevel?: ExperienceLevel;
  location?: string;
  openings: number;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  applicationDeadline?: Date;
  visibility: OpportunityVisibility;
  createdBy: string;
};

export function createOpportunityRecord(tx: Prisma.TransactionClient, data: CreateOpportunityData) {
  return tx.opportunity.create({
    data: {
      organizationId: data.organizationId,
      departmentId: data.departmentId,
      branchId: data.branchId,
      hiringTeamId: data.hiringTeamId,
      pipelineId: data.pipelineId,
      title: data.title,
      slug: data.slug,
      description: data.description,
      responsibilities: data.responsibilities,
      requirements: data.requirements,
      benefits: data.benefits,
      opportunityType: data.opportunityType,
      workplaceType: data.workplaceType,
      experienceLevel: data.experienceLevel,
      location: data.location,
      openings: data.openings,
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      currency: data.currency,
      applicationDeadline: data.applicationDeadline,
      visibility: data.visibility,
      createdBy: data.createdBy,
      updatedBy: data.createdBy,
    },
  });
}

export type UpdateOpportunityData = Partial<
  Omit<CreateOpportunityData, "organizationId" | "createdBy">
> & {
  updatedBy: string;
};

export function updateOpportunityRecord(
  tx: Prisma.TransactionClient,
  id: string,
  data: UpdateOpportunityData,
) {
  return tx.opportunity.update({
    where: { id },
    data: {
      departmentId: data.departmentId,
      branchId: data.branchId,
      hiringTeamId: data.hiringTeamId,
      pipelineId: data.pipelineId,
      title: data.title,
      slug: data.slug,
      description: data.description,
      responsibilities: data.responsibilities,
      requirements: data.requirements,
      benefits: data.benefits,
      opportunityType: data.opportunityType,
      workplaceType: data.workplaceType,
      experienceLevel: data.experienceLevel,
      location: data.location,
      openings: data.openings,
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      currency: data.currency,
      applicationDeadline: data.applicationDeadline,
      visibility: data.visibility,
      updatedBy: data.updatedBy,
    },
  });
}

export function updateOpportunityStatus(
  tx: Prisma.TransactionClient,
  id: string,
  status: OpportunityStatus,
  updatedBy: string,
  extra?: { publishAt?: Date | null; closeAt?: Date | null },
) {
  return tx.opportunity.update({
    where: { id },
    data: { status, updatedBy, ...extra },
  });
}

export function softDeleteOpportunity(tx: Prisma.TransactionClient, id: string, deletedBy: string) {
  return tx.opportunity.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy, updatedBy: deletedBy },
  });
}

/**
 * Delete-all-then-recreate — small dataset per opportunity, no need for a
 * diffing algorithm.
 */
export async function replaceSkillRequirements(
  tx: Prisma.TransactionClient,
  opportunityId: string,
  entries: Array<{ skillId: string; requirementLevel?: string; minimumYears?: number }>,
) {
  await tx.skillRequirement.deleteMany({ where: { opportunityId } });
  if (entries.length === 0) return;
  await tx.skillRequirement.createMany({
    data: entries.map((entry) => ({
      opportunityId,
      skillId: entry.skillId,
      requirementLevel: entry.requirementLevel,
      minimumYears: entry.minimumYears,
    })),
  });
}

export async function findOrCreateSkillsByName(
  tx: Prisma.TransactionClient,
  names: string[],
): Promise<{ id: string; name: string }[]> {
  const skills: { id: string; name: string }[] = [];
  for (const name of names) {
    const skill = await tx.skill.upsert({
      where: { name },
      update: {},
      create: { name },
      select: { id: true, name: true },
    });
    skills.push(skill);
  }
  return skills;
}
