-- CreateTable
CREATE TABLE "application_notes" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "author_membership_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "application_notes_application_id_idx" ON "application_notes"("application_id");

-- AddForeignKey
ALTER TABLE "application_notes" ADD CONSTRAINT "application_notes_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_notes" ADD CONSTRAINT "application_notes_author_membership_id_fkey" FOREIGN KEY ("author_membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
