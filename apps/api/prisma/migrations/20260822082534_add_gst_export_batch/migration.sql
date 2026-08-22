-- CreateTable
CREATE TABLE "gst_export_batches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "generatedByUserId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "manifest" JSONB NOT NULL,

    CONSTRAINT "gst_export_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gst_export_batches_tenantId_side_periodFrom_periodTo_idx" ON "gst_export_batches"("tenantId", "side", "periodFrom", "periodTo");

-- CreateIndex
CREATE UNIQUE INDEX "gst_export_batches_tenantId_batchNumber_key" ON "gst_export_batches"("tenantId", "batchNumber");

-- AddForeignKey
ALTER TABLE "gst_export_batches" ADD CONSTRAINT "gst_export_batches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gst_export_batches" ADD CONSTRAINT "gst_export_batches_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
