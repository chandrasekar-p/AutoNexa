-- AlterEnum: add the two missing inspection checklist categories
ALTER TYPE "InspectionCategory" ADD VALUE 'ELECTRICAL';
ALTER TYPE "InspectionCategory" ADD VALUE 'UNDERBODY';

-- AlterTable
ALTER TABLE "inspections" ADD COLUMN "completedAt" TIMESTAMP(3);

-- Backfill: best-effort completedAt for inspections already COMPLETED
-- before this column existed, so the "duration" display and the
-- Completed-this-month KPI aren't wrong for historical data.
UPDATE "inspections" SET "completedAt" = "updatedAt" WHERE "status" = 'COMPLETED' AND "completedAt" IS NULL;
