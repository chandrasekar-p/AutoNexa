-- CreateEnum
CREATE TYPE "WarrantyClaimStatus" AS ENUM ('OPEN', 'APPROVED', 'REJECTED', 'RESOLVED');

-- AlterTable
ALTER TABLE "job_card_labour" ADD COLUMN     "warrantyClaimId" TEXT,
ADD COLUMN     "warrantyMonths" INTEGER;

-- AlterTable
ALTER TABLE "job_card_parts" ADD COLUMN     "warrantyClaimId" TEXT,
ADD COLUMN     "warrantyKm" INTEGER,
ADD COLUMN     "warrantyMonths" INTEGER;

-- AlterTable
ALTER TABLE "labour_items" ADD COLUMN     "warrantyPeriodMonths" INTEGER;

-- AlterTable
ALTER TABLE "parts" ADD COLUMN     "warrantyKm" INTEGER;

-- CreateTable
CREATE TABLE "warranty_claims" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "claimJobCardId" TEXT NOT NULL,
    "originalJobCardPartId" TEXT,
    "originalJobCardLabourId" TEXT,
    "status" "WarrantyClaimStatus" NOT NULL DEFAULT 'OPEN',
    "isBillable" BOOLEAN NOT NULL DEFAULT true,
    "resolutionNotes" TEXT,
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warranty_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "warranty_claims_tenantId_claimJobCardId_idx" ON "warranty_claims"("tenantId", "claimJobCardId");

-- CreateIndex
CREATE INDEX "warranty_claims_tenantId_status_idx" ON "warranty_claims"("tenantId", "status");

-- CreateIndex
CREATE INDEX "job_card_labour_tenantId_warrantyClaimId_idx" ON "job_card_labour"("tenantId", "warrantyClaimId");

-- CreateIndex
CREATE INDEX "job_card_parts_tenantId_warrantyClaimId_idx" ON "job_card_parts"("tenantId", "warrantyClaimId");

-- AddForeignKey
ALTER TABLE "job_card_labour" ADD CONSTRAINT "job_card_labour_warrantyClaimId_fkey" FOREIGN KEY ("warrantyClaimId") REFERENCES "warranty_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_card_parts" ADD CONSTRAINT "job_card_parts_warrantyClaimId_fkey" FOREIGN KEY ("warrantyClaimId") REFERENCES "warranty_claims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_claimJobCardId_fkey" FOREIGN KEY ("claimJobCardId") REFERENCES "job_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_originalJobCardPartId_fkey" FOREIGN KEY ("originalJobCardPartId") REFERENCES "job_card_parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_originalJobCardLabourId_fkey" FOREIGN KEY ("originalJobCardLabourId") REFERENCES "job_card_labour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranty_claims" ADD CONSTRAINT "warranty_claims_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
