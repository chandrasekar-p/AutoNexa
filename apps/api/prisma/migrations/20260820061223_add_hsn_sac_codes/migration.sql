-- AlterTable
ALTER TABLE "invoice_line_items" ADD COLUMN     "hsnSac" TEXT;

-- AlterTable
ALTER TABLE "job_card_labour" ADD COLUMN     "hsnSac" TEXT;

-- AlterTable
ALTER TABLE "job_card_parts" ADD COLUMN     "hsnSac" TEXT;

-- AlterTable
ALTER TABLE "labour_items" ADD COLUMN     "sacCode" TEXT;

-- AlterTable
ALTER TABLE "parts" ADD COLUMN     "hsnCode" TEXT;
