-- AlterTable
ALTER TABLE "estimates" ADD COLUMN     "estimateNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "estimates_estimateNumber_key" ON "estimates"("estimateNumber");
