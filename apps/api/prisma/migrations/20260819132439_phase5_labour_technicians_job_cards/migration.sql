-- CreateEnum
CREATE TYPE "TechnicianStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "JobCardStatus" AS ENUM ('OPEN', 'DIAGNOSIS', 'WAITING_APPROVAL', 'APPROVED', 'IN_PROGRESS', 'WAITING_PARTS', 'QUALITY_CHECK', 'READY_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "labour_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "standardHours" DECIMAL(6,2) NOT NULL,
    "labourRate" DECIMAL(10,2) NOT NULL,
    "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "technicianCategory" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "labour_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technicians" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT,
    "skills" TEXT[],
    "specialisation" TEXT,
    "experienceYears" INTEGER,
    "status" "TechnicianStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_cards" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobCardNumber" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "estimateId" TEXT,
    "inspectionId" TEXT,
    "technicianId" TEXT,
    "serviceAdvisorId" TEXT,
    "odometer" INTEGER,
    "complaint" TEXT,
    "customerRequest" TEXT,
    "estimatedWork" TEXT,
    "status" "JobCardStatus" NOT NULL DEFAULT 'OPEN',
    "startAt" TIMESTAMP(3),
    "expectedDelivery" TIMESTAMP(3),
    "actualDelivery" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "job_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_card_labour" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobCardId" TEXT NOT NULL,
    "labourItemId" TEXT,
    "description" TEXT,
    "hours" DECIMAL(6,2) NOT NULL,
    "rate" DECIMAL(10,2) NOT NULL,
    "gstRate" DECIMAL(5,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "job_card_labour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_card_status_history" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobCardId" TEXT NOT NULL,
    "fromStatus" "JobCardStatus",
    "toStatus" "JobCardStatus" NOT NULL,
    "changedByUserId" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "job_card_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_card_notes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobCardId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_card_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "labour_items_tenantId_idx" ON "labour_items"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "labour_items_tenantId_code_key" ON "labour_items"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "technicians_userId_key" ON "technicians"("userId");

-- CreateIndex
CREATE INDEX "technicians_tenantId_idx" ON "technicians"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "job_cards_estimateId_key" ON "job_cards"("estimateId");

-- CreateIndex
CREATE INDEX "job_cards_tenantId_idx" ON "job_cards"("tenantId");

-- CreateIndex
CREATE INDEX "job_cards_tenantId_status_idx" ON "job_cards"("tenantId", "status");

-- CreateIndex
CREATE INDEX "job_cards_tenantId_vehicleId_idx" ON "job_cards"("tenantId", "vehicleId");

-- CreateIndex
CREATE INDEX "job_cards_tenantId_customerId_idx" ON "job_cards"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "job_cards_tenantId_technicianId_idx" ON "job_cards"("tenantId", "technicianId");

-- CreateIndex
CREATE UNIQUE INDEX "job_cards_tenantId_jobCardNumber_key" ON "job_cards"("tenantId", "jobCardNumber");

-- CreateIndex
CREATE INDEX "job_card_labour_tenantId_jobCardId_idx" ON "job_card_labour"("tenantId", "jobCardId");

-- CreateIndex
CREATE INDEX "job_card_status_history_tenantId_jobCardId_idx" ON "job_card_status_history"("tenantId", "jobCardId");

-- CreateIndex
CREATE INDEX "job_card_notes_tenantId_jobCardId_idx" ON "job_card_notes"("tenantId", "jobCardId");

-- AddForeignKey
ALTER TABLE "labour_items" ADD CONSTRAINT "labour_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "inspections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "technicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_cards" ADD CONSTRAINT "job_cards_serviceAdvisorId_fkey" FOREIGN KEY ("serviceAdvisorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_card_labour" ADD CONSTRAINT "job_card_labour_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "job_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_card_labour" ADD CONSTRAINT "job_card_labour_labourItemId_fkey" FOREIGN KEY ("labourItemId") REFERENCES "labour_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_card_status_history" ADD CONSTRAINT "job_card_status_history_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "job_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_card_status_history" ADD CONSTRAINT "job_card_status_history_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_card_notes" ADD CONSTRAINT "job_card_notes_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "job_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_card_notes" ADD CONSTRAINT "job_card_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
