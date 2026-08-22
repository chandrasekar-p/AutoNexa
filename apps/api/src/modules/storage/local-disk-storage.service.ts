import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { Injectable } from '@nestjs/common';
import { UPLOAD_ROOT, resolveUploadPath } from '../uploads/upload-storage';
import { StorageService, UploadParams } from './storage.types';

/**
 * STORAGE_MODE=local (the default) — the single-server pilot fit documented
 * in README's infra notes. Reproduces exactly what upload-storage.ts's old
 * Multer diskStorage engine did (tenant subdirectory, UUID filename), just
 * moved behind StorageService so the rest of the app can't tell the
 * difference from S3StorageService.
 */
@Injectable()
export class LocalDiskStorageService implements StorageService {
  async upload({ buffer, tenantId, filename }: UploadParams): Promise<{ key: string }> {
    const dir = join(UPLOAD_ROOT, tenantId);
    await mkdir(dir, { recursive: true });
    const storedName = `${randomUUID()}${extname(filename).toLowerCase()}`;
    await writeFile(join(dir, storedName), buffer);
    // Deliberately bare, no API_PREFIX — see uploads.controller.ts's doc
    // comment on why the frontend's resolveUploadUrl() needs it this way.
    return { key: `/uploads/${tenantId}/${storedName}` };
  }

  // The key already IS the servable relative path in this mode (see
  // main.ts's useStaticAssets) — nothing to sign, nothing expires.
  async getSignedUrl(key: string): Promise<string> {
    return key;
  }

  async getBuffer(key: string): Promise<Buffer> {
    return readFile(resolveUploadPath(key));
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(resolveUploadPath(key));
    } catch (err) {
      // Already gone — this app has no strict upload lifecycle tracking
      // (see InspectionsService.removePhoto's doc comment), so a missing
      // file here is a no-op, not an error.
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }
}
