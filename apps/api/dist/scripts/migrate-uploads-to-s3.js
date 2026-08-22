"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const promises_1 = require("fs/promises");
const upload_storage_1 = require("../src/modules/uploads/upload-storage");
const s3_storage_service_1 = require("../src/modules/storage/s3-storage.service");
const prisma = new client_1.PrismaClient();
const isDryRun = process.argv.includes('--dry-run');
const OLD_PATH_PATTERN = /^\/(api\/v1\/)?uploads\//;
function buildStorage() {
    const bucket = process.env.S3_BUCKET;
    const region = process.env.S3_REGION;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
        throw new Error('Set S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY before running this script');
    }
    return new s3_storage_service_1.S3StorageService({ bucket, region, accessKeyId, secretAccessKey, endpoint: process.env.S3_ENDPOINT });
}
async function migrateField(storage, label, category, rows, updateOne) {
    const candidates = rows.filter((r) => OLD_PATH_PATTERN.test(r.fileValue));
    console.log(`${label}: ${candidates.length} row(s) still on local disk (of ${rows.length} total)`);
    for (const row of candidates) {
        const localPath = (0, upload_storage_1.resolveUploadPath)(row.fileValue);
        try {
            const buffer = await (0, promises_1.readFile)(localPath);
            const filename = row.fileValue.split('/').pop() ?? 'file';
            if (isDryRun) {
                console.log(`  [dry-run] would upload ${localPath} -> tenants/${row.tenantId}/${category}/...`);
                continue;
            }
            const { key } = await storage.upload({ buffer, tenantId: row.tenantId, category, entityId: row.entityId, filename });
            await updateOne(row.id, key);
            console.log(`  migrated ${row.id}: ${row.fileValue} -> ${key}`);
        }
        catch (err) {
            console.error(`  FAILED ${row.id} (${localPath}): ${err instanceof Error ? err.message : err}`);
        }
    }
}
async function main() {
    const storage = buildStorage();
    if (isDryRun)
        console.log('--- DRY RUN — no files will be uploaded, no rows will be changed ---');
    const [vehiclePhotos, logos, inspectionPhotos, vehicleDocuments] = await Promise.all([
        prisma.vehicle.findMany({ where: { photoUrl: { not: null } }, select: { id: true, tenantId: true, photoUrl: true } }),
        prisma.tenantSettings.findMany({ where: { logoUrl: { not: null } }, select: { id: true, tenantId: true, logoUrl: true } }),
        prisma.inspectionPhoto.findMany({ select: { id: true, tenantId: true, inspectionId: true, fileUrl: true } }),
        prisma.vehicleDocument.findMany({ select: { id: true, tenantId: true, vehicleId: true, fileUrl: true } }),
    ]);
    await migrateField(storage, 'Vehicle.photoUrl', 'vehicle-photo', vehiclePhotos.map((v) => ({ id: v.id, tenantId: v.tenantId, fileValue: v.photoUrl, entityId: v.id })), (id, key) => prisma.vehicle.update({ where: { id }, data: { photoUrl: key } }).then(() => undefined));
    await migrateField(storage, 'TenantSettings.logoUrl', 'workshop-logo', logos.map((s) => ({ id: s.id, tenantId: s.tenantId, fileValue: s.logoUrl })), (id, key) => prisma.tenantSettings.update({ where: { id }, data: { logoUrl: key } }).then(() => undefined));
    await migrateField(storage, 'InspectionPhoto.fileUrl', 'inspection-photo', inspectionPhotos.map((p) => ({ id: p.id, tenantId: p.tenantId, fileValue: p.fileUrl, entityId: p.inspectionId })), (id, key) => prisma.inspectionPhoto.update({ where: { id }, data: { fileUrl: key } }).then(() => undefined));
    await migrateField(storage, 'VehicleDocument.fileUrl', 'vehicle-document', vehicleDocuments.map((d) => ({ id: d.id, tenantId: d.tenantId, fileValue: d.fileUrl, entityId: d.vehicleId })), (id, key) => prisma.vehicleDocument.update({ where: { id }, data: { fileUrl: key } }).then(() => undefined));
    console.log(isDryRun ? 'Dry run complete.' : 'Migration complete.');
}
main()
    .catch((err) => {
    console.error(err);
    process.exitCode = 1;
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=migrate-uploads-to-s3.js.map