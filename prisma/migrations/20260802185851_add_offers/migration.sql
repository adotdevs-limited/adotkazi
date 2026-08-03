-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('SENT', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED');

-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE 'HIRED';

-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'SENT',
    "salary" DECIMAL(12,2),
    "currency" TEXT,
    "start_date" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "declined_at" TIMESTAMP(3),
    "withdrawn_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offers_application_id_idx" ON "offers"("application_id");

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
