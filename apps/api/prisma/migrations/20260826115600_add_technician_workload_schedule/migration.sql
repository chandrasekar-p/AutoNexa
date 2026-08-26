-- AlterTable
ALTER TABLE "technicians"
  ADD COLUMN "maxConcurrentJobs" INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN "workingDays" TEXT[] NOT NULL DEFAULT ARRAY['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']::TEXT[],
  ADD COLUMN "workingHoursStart" TEXT,
  ADD COLUMN "workingHoursEnd" TEXT;
