-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "pendingGatewayOrderId" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "provider" TEXT,
ADD COLUMN     "providerOrderId" TEXT,
ADD COLUMN     "providerPaymentId" TEXT,
ADD COLUMN     "providerSignature" TEXT;

-- CreateTable
CREATE TABLE "payment_gateway_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "providerOrderId" TEXT,
    "signatureValid" BOOLEAN NOT NULL,
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_gateway_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_gateway_events_tenantId_createdAt_idx" ON "payment_gateway_events"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "payment_gateway_events_providerOrderId_idx" ON "payment_gateway_events"("providerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_gateway_events_provider_eventId_key" ON "payment_gateway_events"("provider", "eventId");

-- CreateIndex
CREATE INDEX "invoices_pendingGatewayOrderId_idx" ON "invoices"("pendingGatewayOrderId");

-- CreateIndex
CREATE INDEX "payments_providerOrderId_idx" ON "payments"("providerOrderId");
