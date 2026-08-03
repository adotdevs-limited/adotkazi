-- CreateEnum
CREATE TYPE "DailyLogStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'RETURNED');

-- CreateTable
CREATE TABLE "daily_logs" (
    "id" UUID NOT NULL,
    "placement_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "activity_description" TEXT NOT NULL,
    "skills_learned" TEXT,
    "hours_worked" DECIMAL(4,2) NOT NULL,
    "notes" TEXT,
    "status" "DailyLogStatus" NOT NULL DEFAULT 'SUBMITTED',
    "review_comment" TEXT,
    "reviewed_by_membership_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_logs_placement_id_idx" ON "daily_logs"("placement_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_logs_placement_id_date_key" ON "daily_logs"("placement_id", "date");

-- AddForeignKey
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_placement_id_fkey" FOREIGN KEY ("placement_id") REFERENCES "placements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_reviewed_by_membership_id_fkey" FOREIGN KEY ("reviewed_by_membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
