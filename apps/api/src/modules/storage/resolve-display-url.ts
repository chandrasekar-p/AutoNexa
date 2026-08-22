import { StorageService } from './storage.types';

/**
 * Null-safe wrapper around StorageService.getSignedUrl — every read site
 * that returns a stored file reference (Vehicle.photoUrl,
 * TenantSettings.logoUrl, InspectionPhoto.fileUrl, VehicleDocument.fileUrl)
 * calls this instead of returning the raw DB value directly. Identity in
 * LOCAL_DISK mode, a freshly-signed time-limited URL in S3 mode — callers
 * never need to know which.
 */
export function resolveDisplayUrl(storage: StorageService, key: string | null): Promise<string | null> {
  if (!key) return Promise.resolve(null);
  return storage.getSignedUrl(key);
}
