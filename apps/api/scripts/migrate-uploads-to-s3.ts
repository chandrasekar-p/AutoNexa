/**
 * One-off migration: uploads any file still sitting on local disk
 * (apps/api/uploads/) into S3-compatible object storage, and rewrites the
 * DB row that references it to the new object key. Run once, after
 * setting STORAGE_MODE=s3 and the S3_* env vars for real, before cutting
 * traffic over — not part of any deploy/start hook.
 *
 * Idempotent: a row's stored value only ever matches the OLD local-disk
 * shape (`/uploads/...` or `/api/v1/uploads/...`) before migration; once
 * rewritten to the new `tenants/{tenantId}/...` key shape, a second run
 * finds nothing left matching the old pattern for that row and skips it.
 * Never throws on one bad row — logs and moves on, so one missing file
 * doesn't abort the whole batch.
 *
 * Usage:
 *   npm run migrate:uploads-to-s3 -- --dry-run   (prints what would happen, writes nothing)
 *   npm run migrate:uploads-to-s3                (actually uploads + rewrites)
 */
import { PrismaClient } from '@prisma/client'; // imported first — Prisma's generated client loads .env as a side effect, same as prisma/seed.ts
import { readFile } from 'fs/promises';
import { resolveUploadPath } from '../src/modules/uploads/upload-storage';
import { S3StorageService } from '../src/modules/storage/s3-storage.service';
import { UploadCategory } from '../src/modules/storage/storage.types';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');

const OLD_PATH_PATTERN = /^\/(api\/v1\/)?uploads\//;

function buildStorage(): S3StorageService {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new Error('Set S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY before running this script');
  }
  return new S3StorageService({ bucket, region, accessKeyId, secretAccessKey, endpoint: process.env.S3_ENDPOINT });
}

interface MigratableRow {
  id: string;
  tenantId: string;
  fileValue: string;
  entityId?: string;
}

async function migrateField(
  storage: S3StorageService,
  label: string,
  category: UploadCategory,
  rows: MigratableRow[],
  updateOne: (id: string, newKey: string) => Promise<void>,
): Promise<void> {
  const candidates = rows.filter((r) => OLD_PATH_PATTERN.test(r.fileValue));
  console.log(`${label}: ${candidates.length} row(s) still on local disk (of ${rows.length} total)`);

  for (const row of candidates) {
    const localPath = resolveUploadPath(row.fileValue);
    try {
      const buffer = await readFile(localPath);
      const filename = row.fileValue.split('/').pop() ?? 'file';

      if (isDryRun) {
        console.log(`  [dry-run] would upload ${localPath} -> tenants/${row.tenantId}/${category}/...`);
        continue;
      }

      const { key } = await storage.upload({ buffer, tenantId: row.tenantId, category, entityId: row.entityId, filename });
      await updateOne(row.id, key);
      console.log(`  migrated ${row.id}: ${row.fileValue} -> ${key}`);
    } catch (err) {
      console.error(`  FAILED ${row.id} (${localPath}): ${err instanceof Error ? err.message : err}`);
    }
  }
}

async function main() {
  const storage = buildStorage();
  if (isDryRun) console.log('--- DRY RUN — no files will be uploaded, no rows will be changed ---');

  const [vehiclePhotos, logos, inspectionPhotos, vehicleDocuments] = await Promise.all([
    prisma.vehicle.findMany({ where: { photoUrl: { not: null } }, select: { id: true, tenantId: true, photoUrl: true } }),
    prisma.tenantSettings.findMany({ where: { logoUrl: { not: null } }, select: { id: true, tenantId: true, logoUrl: true } }),
    prisma.inspectionPhoto.findMany({ select: { id: true, tenantId: true, inspectionId: true, fileUrl: true } }),
    prisma.vehicleDocument.findMany({ select: { id: true, tenantId: true, vehicleId: true, fileUrl: true } }),
  ]);

  await migrateField(
    storage,
    'Vehicle.photoUrl',
    'vehicle-photo',
    vehiclePhotos.map((v) => ({ id: v.id, tenantId: v.tenantId, fileValue: v.photoUrl!, entityId: v.id })),
    (id, key) => prisma.vehicle.update({ where: { id }, data: { photoUrl: key } }).then(() => undefined),
  );

  await migrateField(
    storage,
    'TenantSettings.logoUrl',
    'workshop-logo',
    logos.map((s) => ({ id: s.id, tenantId: s.tenantId, fileValue: s.logoUrl! })),
    (id, key) => prisma.tenantSettings.update({ where: { id }, data: { logoUrl: key } }).then(() => undefined),
  );

  await migrateField(
    storage,
    'InspectionPhoto.fileUrl',
    'inspection-photo',
    inspectionPhotos.map((p) => ({ id: p.id, tenantId: p.tenantId, fileValue: p.fileUrl, entityId: p.inspectionId })),
    (id, key) => prisma.inspectionPhoto.update({ where: { id }, data: { fileUrl: key } }).then(() => undefined),
  );

  await migrateField(
    storage,
    'VehicleDocument.fileUrl',
    'vehicle-document',
    vehicleDocuments.map((d) => ({ id: d.id, tenantId: d.tenantId, fileValue: d.fileUrl, entityId: d.vehicleId })),
    (id, key) => prisma.vehicleDocument.update({ where: { id }, data: { fileUrl: key } }).then(() => undefined),
  );

  console.log(isDryRun ? 'Dry run complete.' : 'Migration complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
