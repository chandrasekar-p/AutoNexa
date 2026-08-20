import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import type { Request } from 'express';
import { BadRequestException } from '@nestjs/common';

type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

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

export function imageFileFilter(_req: Request, file: Express.Multer.File, callback: FileFilterCallback): void {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    callback(new BadRequestException('Only JPEG, PNG, or WEBP images are allowed'), false);
    return;
  }
  callback(null, true);
}
