-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('PHONE', 'VIDEO', 'IN_PERSON', 'TECHNICAL', 'PANEL', 'ASSESSMENT_REVIEW');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InterviewRecommendation" AS ENUM ('STRONG_YES', 'YES', 'NO', 'STRONG_NO');

-- CreateTable
CREATE TABLE "interviews" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "interview_type" "InterviewType" NOT NULL,
    "scheduled_start" TIMESTAMP(3) NOT NULL,
    "scheduled_end" TIMESTAMP(3) NOT NULL,
    "meeting_provider" TEXT,
    "meeting_link" TEXT,
    "location" TEXT,
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interview_participants" (
    "interview_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,

    CONSTRAINT "interview_participants_pkey" PRIMARY KEY ("interview_id","membership_id")
);

-- CreateTable
CREATE TABLE "interview_feedback" (
    "id" UUID NOT NULL,
    "interview_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "recommendation" "InterviewRecommendation" NOT NULL,
    "comments" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interview_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interviews_application_id_idx" ON "interviews"("application_id");

-- CreateIndex
CREATE INDEX "interview_participants_membership_id_idx" ON "interview_participants"("membership_id");

-- CreateIndex
CREATE UNIQUE INDEX "interview_feedback_interview_id_membership_id_key" ON "interview_feedback"("interview_id", "membership_id");

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_participants" ADD CONSTRAINT "interview_participants_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_participants" ADD CONSTRAINT "interview_participants_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_feedback" ADD CONSTRAINT "interview_feedback_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_feedback" ADD CONSTRAINT "interview_feedback_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
