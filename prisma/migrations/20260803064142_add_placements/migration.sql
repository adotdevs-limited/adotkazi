-- CreateEnum
CREATE TYPE "PlacementStatus" AS ENUM ('PENDING', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "placements" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "supervisor_membership_id" UUID,
    "status" "PlacementStatus" NOT NULL DEFAULT 'PENDING',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "placements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "placements_application_id_key" ON "placements"("application_id");

-- CreateIndex
CREATE INDEX "placements_supervisor_membership_id_idx" ON "placements"("supervisor_membership_id");

-- AddForeignKey
ALTER TABLE "placements" ADD CONSTRAINT "placements_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "placements" ADD CONSTRAINT "placements_supervisor_membership_id_fkey" FOREIGN KEY ("supervisor_membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
