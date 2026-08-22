-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "reminderOptOut" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "delivery_logs" ADD COLUMN     "dedupeKey" TEXT;

-- AlterTable
ALTER TABLE "tenant_settings" ADD COLUMN     "reminderInsuranceEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reminderPucEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reminderServiceDueEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reminderThresholdDays" INTEGER[] DEFAULT ARRAY[30, 15, 7]::INTEGER[],
ADD COLUMN     "serviceIntervalKm" INTEGER NOT NULL DEFAULT 5000,
ADD COLUMN     "serviceIntervalMonths" INTEGER NOT NULL DEFAULT 6;

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "serviceIntervalKmOverride" INTEGER,
ADD COLUMN     "serviceIntervalMonthsOverride" INTEGER;

-- CreateIndex
CREATE INDEX "delivery_logs_tenantId_event_dedupeKey_idx" ON "delivery_logs"("tenantId", "event", "dedupeKey");
