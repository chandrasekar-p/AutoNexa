-- AlterTable
ALTER TABLE "tenant_settings" ADD COLUMN "invoicePaymentTermDays" INTEGER NOT NULL DEFAULT 15;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "dueDate" TIMESTAMP(3);

-- Backfill: existing invoices get a dueDate computed from their own
-- createdAt plus their tenant's current payment-term setting, so the
-- overdue/aging features have real data for historical invoices too,
-- not just ones generated after this migration.
UPDATE "invoices" i
SET "dueDate" = i."createdAt" + (ts."invoicePaymentTermDays" || ' days')::interval
FROM "tenant_settings" ts
WHERE ts."tenantId" = i."tenantId" AND i."dueDate" IS NULL;
