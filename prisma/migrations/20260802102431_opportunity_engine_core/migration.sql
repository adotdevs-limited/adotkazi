-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'GRADUATE_PROGRAM', 'APPRENTICESHIP', 'VOLUNTEER');

-- CreateEnum
CREATE TYPE "WorkplaceType" AS ENUM ('ON_SITE', 'REMOTE', 'HYBRID');

-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('ENTRY', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'EXECUTIVE');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'SCHEDULED', 'PUBLISHED', 'PAUSED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OpportunityVisibility" AS ENUM ('PUBLIC', 'ORGANIZATION_ONLY', 'INVITATION_ONLY', 'PRIVATE_DRAFT');

-- DropForeignKey
ALTER TABLE "invitations" DROP CONSTRAINT "invitations_invited_by_fkey";

-- AlterTable
ALTER TABLE "invitations" ALTER COLUMN "invited_by" DROP NOT NULL;

-- CreateTable
CREATE TABLE "opportunities" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "branch_id" UUID,
    "department_id" UUID NOT NULL,
    "hiring_team_id" UUID,
    "pipeline_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "responsibilities" TEXT,
    "requirements" TEXT,
    "benefits" TEXT,
    "opportunity_type" "OpportunityType" NOT NULL,
    "workplace_type" "WorkplaceType" NOT NULL,
    "experience_level" "ExperienceLevel",
    "location" TEXT,
    "openings" INTEGER NOT NULL DEFAULT 1,
    "salary_min" DECIMAL(12,2),
    "salary_max" DECIMAL(12,2),
    "currency" TEXT,
    "application_deadline" TIMESTAMP(3),
    "publish_at" TIMESTAMP(3),
    "close_at" TIMESTAMP(3),
    "status" "OpportunityStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "OpportunityVisibility" NOT NULL DEFAULT 'PUBLIC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" UUID,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipelines" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_stages" (
    "id" UUID NOT NULL,
    "pipeline_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "color" TEXT,
    "is_terminal" BOOLEAN NOT NULL DEFAULT false,
    "allows_feedback" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hiring_teams" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "hiring_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_skill_requirements" (
    "opportunity_id" UUID NOT NULL,
    "skill_id" UUID NOT NULL,
    "requirement_level" TEXT,
    "minimum_years" INTEGER,

    CONSTRAINT "opportunity_skill_requirements_pkey" PRIMARY KEY ("opportunity_id","skill_id")
);

-- CreateIndex
CREATE INDEX "opportunities_organization_id_idx" ON "opportunities"("organization_id");

-- CreateIndex
CREATE INDEX "opportunities_organization_id_status_idx" ON "opportunities"("organization_id", "status");

-- CreateIndex
CREATE INDEX "opportunities_department_id_idx" ON "opportunities"("department_id");

-- CreateIndex
CREATE INDEX "opportunities_pipeline_id_idx" ON "opportunities"("pipeline_id");

-- CreateIndex
CREATE UNIQUE INDEX "opportunities_organization_id_slug_key" ON "opportunities"("organization_id", "slug");

-- CreateIndex
CREATE INDEX "pipelines_organization_id_idx" ON "pipelines"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "pipelines_organization_id_name_key" ON "pipelines"("organization_id", "name");

-- CreateIndex
CREATE INDEX "pipeline_stages_pipeline_id_idx" ON "pipeline_stages"("pipeline_id");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_stages_pipeline_id_order_key" ON "pipeline_stages"("pipeline_id", "order");

-- CreateIndex
CREATE INDEX "hiring_teams_organization_id_idx" ON "hiring_teams"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "hiring_teams_organization_id_name_key" ON "hiring_teams"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE INDEX "skills_category_idx" ON "skills"("category");

-- CreateIndex
CREATE INDEX "opportunity_skill_requirements_skill_id_idx" ON "opportunity_skill_requirements"("skill_id");

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_hiring_team_id_fkey" FOREIGN KEY ("hiring_team_id") REFERENCES "hiring_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_teams" ADD CONSTRAINT "hiring_teams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_skill_requirements" ADD CONSTRAINT "opportunity_skill_requirements_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_skill_requirements" ADD CONSTRAINT "opportunity_skill_requirements_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
