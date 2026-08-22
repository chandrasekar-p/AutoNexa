import { rm } from 'fs/promises';
import { join } from 'path';
import { LocalDiskStorageService } from '../src/modules/storage/local-disk-storage.service';
import { UPLOAD_ROOT } from '../src/modules/uploads/upload-storage';

// Real filesystem I/O, deliberately — this is the "STORAGE_MODE=local
// still works unchanged" regression check the S3 migration must not
// break for contributors without S3 credentials. Uses a throwaway tenant
// id so it never collides with real data, and cleans up after itself.
describe('LocalDiskStorageService', () => {
  const tenantId = `test-tenant-${Date.now()}`;
  const storage = new LocalDiskStorageService();

  afterAll(async () => {
    await rm(join(UPLOAD_ROOT, tenantId), { recursive: true, force: true });
  });

  it('writes the buffer under uploads/{tenantId}/ and returns a bare /uploads/... key', async () => {
    const { key } = await storage.upload({
      buffer: Buffer.from('hello'),
      tenantId,
      category: 'vehicle-photo',
      entityId: 'vehicle-1',
      filename: 'photo.jpg',
    });
    expect(key).toMatch(new RegExp(`^/uploads/${tenantId}/[0-9a-f-]+\\.jpg$`));
  });

  it('getSignedUrl is an identity function — the key already is the servable path', async () => {
    const { key } = await storage.upload({ buffer: Buffer.from('x'), tenantId, category: 'workshop-logo', filename: 'logo.png' });
    await expect(storage.getSignedUrl(key)).resolves.toBe(key);
  });

  it('getBuffer reads back exactly what was written', async () => {
    const original = Buffer.from('exact bytes, round-tripped');
    const { key } = await storage.upload({ buffer: original, tenantId, category: 'inspection-photo', entityId: 'insp-1', filename: 'a.webp' });
    const readBack = await storage.getBuffer(key);
    expect(readBack.equals(original)).toBe(true);
  });

  it('delete removes the file, and deleting an already-missing file is not an error', async () => {
    const { key } = await storage.upload({ buffer: Buffer.from('y'), tenantId, category: 'vehicle-document', entityId: 'v-1', filename: 'doc.png' });
    await storage.delete(key);
    await expect(storage.getBuffer(key)).rejects.toThrow();
    await expect(storage.delete(key)).resolves.toBeUndefined();
  });
});
