"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("fs/promises");
const path_1 = require("path");
const local_disk_storage_service_1 = require("../src/modules/storage/local-disk-storage.service");
const upload_storage_1 = require("../src/modules/uploads/upload-storage");
describe('LocalDiskStorageService', () => {
    const tenantId = `test-tenant-${Date.now()}`;
    const storage = new local_disk_storage_service_1.LocalDiskStorageService();
    afterAll(async () => {
        await (0, promises_1.rm)((0, path_1.join)(upload_storage_1.UPLOAD_ROOT, tenantId), { recursive: true, force: true });
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
//# sourceMappingURL=local-disk-storage.spec.js.map