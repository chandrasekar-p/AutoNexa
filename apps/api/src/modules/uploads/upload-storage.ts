import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import type { Request } from 'express';
import { BadRequestException } from '@nestjs/common';

type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { API_PREFIX } from '../../common/api-prefix';

// Local-disk storage — the right fit for a single-server pilot deployment
// (see apps/api/README.md's infra notes); migrating to S3-compatible
// object storage later only touches this file and main.ts's static route,
// nothing else, since every caller only ever sees the returned relative
// URL, never a filesystem path.
export const UPLOAD_ROOT = join(process.cwd(), 'uploads');

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

export const uploadStorage = diskStorage({
  destination: (req: Request, _file, callback) => {
    // Populated by the globally-registered JwtAuthGuard, which runs before
    // this interceptor — see auth.module.ts's APP_GUARD ordering.
    const user = req.user as AuthenticatedUser;
    const dir = join(UPLOAD_ROOT, user.tenantId);
    mkdirSync(dir, { recursive: true });
    callback(null, dir);
  },
  filename: (_req, file, callback) => {
    // Never trust the original filename for the on-disk path (directory
    // traversal, collisions) — a fresh UUID plus the validated extension
    // is the only thing written to disk.
    callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
  },
});

/**
 * Maps a stored relative upload URL (as returned by POST /uploads, and
 * saved as-is onto e.g. TenantSettings.logoUrl) back to its absolute path
 * on disk. Handles both the current `/${API_PREFIX}/uploads/...` shape
 * and the legacy bare `/uploads/...` shape some already-saved rows still
 * carry from before API_PREFIX was applied to the static mount (see
 * api-prefix.ts's doc comment — same class of bug, so this is the one
 * place the URL-to-disk-path translation happens instead of being
 * duplicated ad hoc wherever a stored upload URL needs reading back).
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
  callback(null, true);
}
