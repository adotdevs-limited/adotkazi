-- CreateTable
CREATE TABLE "saved_opportunities" (
    "id" UUID NOT NULL,
    "candidate_id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_opportunities_opportunity_id_idx" ON "saved_opportunities"("opportunity_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_opportunities_candidate_id_opportunity_id_key" ON "saved_opportunities"("candidate_id", "opportunity_id");

-- AddForeignKey
ALTER TABLE "saved_opportunities" ADD CONSTRAINT "saved_opportunities_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_opportunities" ADD CONSTRAINT "saved_opportunities_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
