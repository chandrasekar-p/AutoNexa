-- DropIndex
DROP INDEX "parts_tenantId_sku_idx";

-- CreateIndex (unique)
CREATE UNIQUE INDEX "parts_tenantId_sku_key" ON "parts"("tenantId", "sku");
