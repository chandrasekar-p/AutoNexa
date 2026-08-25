-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "customerNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "customers_customerNumber_key" ON "customers"("customerNumber");

-- AlterTable
ALTER TABLE "tenant_settings" ADD COLUMN     "customerPrefix" TEXT NOT NULL DEFAULT 'CUST';
