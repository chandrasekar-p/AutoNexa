-- CreateEnum
CREATE TYPE "PartUnit" AS ENUM ('PIECE', 'LITRE', 'ML', 'KG', 'GRAM');

-- AlterTable
ALTER TABLE "goods_receipt_items" ALTER COLUMN "quantityReceived" SET DATA TYPE DECIMAL(10,3);

-- AlterTable
ALTER TABLE "inventory_transactions" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(10,3);

-- AlterTable
ALTER TABLE "invoice_line_items" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(10,3);

-- AlterTable
ALTER TABLE "job_card_parts" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(10,3);

-- AlterTable
ALTER TABLE "parts" ADD COLUMN     "unit" "PartUnit" NOT NULL DEFAULT 'PIECE',
ALTER COLUMN "currentStock" SET DEFAULT 0,
ALTER COLUMN "currentStock" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "minStock" SET DEFAULT 0,
ALTER COLUMN "minStock" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "maxStock" SET DATA TYPE DECIMAL(10,3);

-- AlterTable
ALTER TABLE "purchase_order_items" ALTER COLUMN "quantityOrdered" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "quantityReceived" SET DEFAULT 0,
ALTER COLUMN "quantityReceived" SET DATA TYPE DECIMAL(10,3);

