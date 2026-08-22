-- CreateEnum
CREATE TYPE "CustomerPackageStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LoyaltyTransactionType" AS ENUM ('EARNED', 'REDEEMED', 'ADJUSTED');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "loyaltyPointsBalance" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "loyaltyDiscountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "loyaltyPointsRedeemed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "job_cards" ADD COLUMN     "redeemedPackageId" TEXT;

-- AlterTable
ALTER TABLE "tenant_settings" ADD COLUMN     "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "loyaltyPointValueRupees" DECIMAL(6,2) NOT NULL DEFAULT 1,
ADD COLUMN     "loyaltyPointsPerRupee" DECIMAL(6,4) NOT NULL DEFAULT 0.01,
ADD COLUMN     "reminderPackageExpiryEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "service_packages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "gstRate" DECIMAL(5,2) NOT NULL,
    "validityMonths" INTEGER NOT NULL,
    "visitLimit" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "service_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_package_labour_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "servicePackageId" TEXT NOT NULL,
    "labourItemId" TEXT NOT NULL,

    CONSTRAINT "service_package_labour_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_package_parts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "servicePackageId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,

    CONSTRAINT "service_package_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_package_part_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "servicePackageId" TEXT NOT NULL,
    "partCategoryId" TEXT NOT NULL,

    CONSTRAINT "service_package_part_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_service_packages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "servicePackageId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "purchaseInvoiceId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "visitLimit" INTEGER,
    "visitsUsed" INTEGER NOT NULL DEFAULT 0,
    "status" "CustomerPackageStatus" NOT NULL DEFAULT 'ACTIVE',
    "renewedFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_service_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_transactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "type" "LoyaltyTransactionType" NOT NULL,
    "points" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "note" TEXT,
    "adjustedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_packages_tenantId_idx" ON "service_packages"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "service_package_labour_items_servicePackageId_labourItemId_key" ON "service_package_labour_items"("servicePackageId", "labourItemId");

-- CreateIndex
CREATE UNIQUE INDEX "service_package_parts_servicePackageId_partId_key" ON "service_package_parts"("servicePackageId", "partId");

-- CreateIndex
CREATE UNIQUE INDEX "service_package_part_categories_servicePackageId_partCatego_key" ON "service_package_part_categories"("servicePackageId", "partCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_service_packages_purchaseInvoiceId_key" ON "customer_service_packages"("purchaseInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_service_packages_renewedFromId_key" ON "customer_service_packages"("renewedFromId");

-- CreateIndex
CREATE INDEX "customer_service_packages_tenantId_customerId_idx" ON "customer_service_packages"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "customer_service_packages_tenantId_vehicleId_idx" ON "customer_service_packages"("tenantId", "vehicleId");

-- CreateIndex
CREATE INDEX "customer_service_packages_tenantId_status_endDate_idx" ON "customer_service_packages"("tenantId", "status", "endDate");

-- CreateIndex
CREATE INDEX "loyalty_transactions_tenantId_customerId_createdAt_idx" ON "loyalty_transactions"("tenantId", "customerId", "createdAt");

-- CreateIndex
CREATE INDEX "job_cards_tenantId_redeemedPackageId_idx" ON "job_cards"("tenantId", "redeemedPackageId");

-- AddForeignKey
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_redeemedPackageId_fkey" FOREIGN KEY ("redeemedPackageId") REFERENCES "customer_service_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_packages" ADD CONSTRAINT "service_packages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_package_labour_items" ADD CONSTRAINT "service_package_labour_items_servicePackageId_fkey" FOREIGN KEY ("servicePackageId") REFERENCES "service_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_package_labour_items" ADD CONSTRAINT "service_package_labour_items_labourItemId_fkey" FOREIGN KEY ("labourItemId") REFERENCES "labour_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_package_parts" ADD CONSTRAINT "service_package_parts_servicePackageId_fkey" FOREIGN KEY ("servicePackageId") REFERENCES "service_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_package_parts" ADD CONSTRAINT "service_package_parts_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_package_part_categories" ADD CONSTRAINT "service_package_part_categories_servicePackageId_fkey" FOREIGN KEY ("servicePackageId") REFERENCES "service_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_package_part_categories" ADD CONSTRAINT "service_package_part_categories_partCategoryId_fkey" FOREIGN KEY ("partCategoryId") REFERENCES "part_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_service_packages" ADD CONSTRAINT "customer_service_packages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_service_packages" ADD CONSTRAINT "customer_service_packages_servicePackageId_fkey" FOREIGN KEY ("servicePackageId") REFERENCES "service_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_service_packages" ADD CONSTRAINT "customer_service_packages_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_service_packages" ADD CONSTRAINT "customer_service_packages_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_service_packages" ADD CONSTRAINT "customer_service_packages_purchaseInvoiceId_fkey" FOREIGN KEY ("purchaseInvoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_service_packages" ADD CONSTRAINT "customer_service_packages_renewedFromId_fkey" FOREIGN KEY ("renewedFromId") REFERENCES "customer_service_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_adjustedByUserId_fkey" FOREIGN KEY ("adjustedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
