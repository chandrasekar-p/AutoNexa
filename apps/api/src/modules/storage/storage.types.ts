/**
 * The one boundary the rest of the app is allowed to talk to for file
 * bytes — no controller/service ever touches `fs` or the S3 SDK directly.
 * Two implementations behind this interface (local-disk-storage.service.ts,
 * s3-storage.service.ts), selected by STORAGE_MODE — see storage.module.ts.
 */

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

export type UploadCategory = 'vehicle-photo' | 'inspection-photo' | 'vehicle-document' | 'workshop-logo' | 'user-avatar' | 'login-background';

export interface UploadParams {
  buffer: Buffer;
  tenantId: string;
  category: UploadCategory;
  // Omitted for tenant-level uploads (workshop-logo has no owning entity).
  entityId?: string;
  filename: string;
}

export interface StorageService {
  /**
   * Returns the stored reference — a bare `/uploads/...` path in LOCAL_DISK
   * mode (identical to today's behavior), an S3 object key in S3 mode.
   * Callers persist this value as-is (Vehicle.photoUrl, etc.) and never
   * interpret its shape themselves.
   */
  upload(params: UploadParams): Promise<{ key: string }>;

  /**
   * Resolves a stored key into something a browser can load. LOCAL_DISK:
   * identity — the key already IS the servable relative path (see
   * main.ts's useStaticAssets). S3: a signed, time-limited URL, freshly
   * generated on every call — never cached/stored, since it expires.
   */
  getSignedUrl(key: string): Promise<string>;

  /** Raw bytes, server-side only — e.g. invoice-pdf.ts embedding the workshop logo into a PDF. Never exposed over HTTP. */
  getBuffer(key: string): Promise<Buffer>;

  /** Best-effort — an already-missing object is not an error (nothing in this app tracks upload lifecycle strictly; see InspectionsService.removePhoto). */
  delete(key: string): Promise<void>;
}
