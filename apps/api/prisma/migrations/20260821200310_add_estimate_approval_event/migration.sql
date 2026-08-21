-- CreateTable
CREATE TABLE "estimate_approval_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "estimateId" TEXT,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estimate_approval_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "estimate_approval_events_tenantId_estimateId_idx" ON "estimate_approval_events"("tenantId", "estimateId");

-- AddForeignKey
ALTER TABLE "estimate_approval_events" ADD CONSTRAINT "estimate_approval_events_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
