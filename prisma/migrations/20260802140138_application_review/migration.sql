-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('ACTIVE', 'REJECTED');

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "current_stage_id" UUID,
ADD COLUMN     "status" "ApplicationStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "applications_current_stage_id_idx" ON "applications"("current_stage_id");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_current_stage_id_fkey" FOREIGN KEY ("current_stage_id") REFERENCES "pipeline_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
