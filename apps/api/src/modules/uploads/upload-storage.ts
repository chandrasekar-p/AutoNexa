import { extname, join } from 'path';
import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { API_PREFIX } from '../../common/api-prefix';

type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

// Local-disk root — only meaningful in STORAGE_MODE=local (see
// local-disk-storage.service.ts and main.ts's useStaticAssets, the one
// place outside StorageService that still needs to know this path exists).
export const UPLOAD_ROOT = join(process.cwd(), 'uploads');

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
// Extension checked independently of the declared MIME type — a client
// can lie about Content-Type, so this catches a mismatched/disallowed
// extension even when the MIME check alone would pass. Per the Phase 1
// security doc: "validate MIME type + extension".
const ALLOWED_EXTENSIONS_BY_MIME: Record<string, Set<string>> = {
  'image/jpeg': new Set(['.jpg', '.jpeg']),
  'image/png': new Set(['.png']),
  'image/webp': new Set(['.webp']),
};
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Maps a stored relative upload URL (as returned by POST /uploads in
 * STORAGE_MODE=local, and saved as-is onto e.g. TenantSettings.logoUrl)
 * back to its absolute path on disk. Handles both the current
 * `/${API_PREFIX}/uploads/...` shape and the legacy bare `/uploads/...`
 * shape some already-saved rows still carry from before API_PREFIX was
 * applied to the static mount (see api-prefix.ts's doc comment).
 */
export function resolveUploadPath(url: string): string {
  const relative = url.replace(new RegExp(`^/(${API_PREFIX}/)?uploads/`), '');
  return join(UPLOAD_ROOT, relative);
}

export function imageFileFilter(_req: Request, file: Express.Multer.File, callback: FileFilterCallback): void {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    callback(new BadRequestException('Only JPEG, PNG, or WEBP images are allowed'), false);
    return;
  }
  const ext = extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS_BY_MIME[file.mimetype]!.has(ext)) {
    callback(new BadRequestException('File extension does not match its content type'), false);
    return;
  }
  callback(null, true);
}
