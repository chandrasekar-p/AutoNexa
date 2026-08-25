-- AlterTable
ALTER TABLE "tenant_settings" ADD COLUMN     "notifyByEmail" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyBySms" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyByWhatsapp" BOOLEAN NOT NULL DEFAULT true;
