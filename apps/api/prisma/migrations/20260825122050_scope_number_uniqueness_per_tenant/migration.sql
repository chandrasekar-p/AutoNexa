-- Fix: customerNumber/estimateNumber were declared globally @unique instead
-- of unique-per-tenant (unlike Invoice.invoiceNumber/JobCard.jobCardNumber,
-- which correctly use @@unique([tenantId, ...])). Each tenant's sequence
-- independently starts at 1, so a bare unique constraint collides the
-- moment a second tenant's first row also becomes "CUST-0001"/"EST-0001" —
-- caught during the customer-number backfill script when a second tenant
-- hit exactly that collision.

-- DropIndex
DROP INDEX "customers_customerNumber_key";

-- DropIndex
DROP INDEX "estimates_estimateNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "customers_tenantId_customerNumber_key" ON "customers"("tenantId", "customerNumber");

-- CreateIndex
CREATE UNIQUE INDEX "estimates_tenantId_estimateNumber_key" ON "estimates"("tenantId", "estimateNumber");
