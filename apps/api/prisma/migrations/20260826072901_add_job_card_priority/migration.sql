-- CreateEnum
CREATE TYPE "JobCardPriority" AS ENUM ('NORMAL', 'HIGH', 'URGENT');

-- AlterTable
ALTER TABLE "job_cards" ADD COLUMN "priority" "JobCardPriority" NOT NULL DEFAULT 'NORMAL';
