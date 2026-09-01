import { StorageService } from './storage.types';

// S3StorageService signs a brand-new URL (fresh signature + timestamp) on
// every call, so the URL string itself changed on every single resolve —
// the browser's HTTP cache is keyed on the exact URL, so every image
// resolved through this function (vehicle photos, the login wallpaper,
// inspection photos, ...) was re-downloaded from scratch on every page
// load, every re-render, even for the exact same file. Caching the signed
// URL for a few minutes — well under its own 15-minute expiry
// (SIGNED_URL_EXPIRY_SECONDS in s3-storage.service.ts) — lets the browser
// actually reuse a previous download while still rotating the URL
// periodically, keeping the original "time-limited, so a leaked URL goes
// stale" intent, just less aggressively than "never cached." A no-op in
// LOCAL_DISK mode, whose getSignedUrl is already a stable identity
// function (returns the same key every time regardless).
const CACHE_TTL_MS = 10 * 60 * 1000;
const urlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Null-safe wrapper around StorageService.getSignedUrl — every read site
 * that returns a stored file reference (Vehicle.photoUrl,
 * TenantSettings.logoUrl, InspectionPhoto.fileUrl, VehicleDocument.fileUrl)
 * calls this instead of returning the raw DB value directly. Identity in
 * LOCAL_DISK mode, a freshly-signed time-limited URL in S3 mode — callers
 * never need to know which.
 */
export async function resolveDisplayUrl(storage: StorageService, key: string | null): Promise<string | null> {
  if (!key) return null;

  const cached = urlCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const url = await storage.getSignedUrl(key);
  urlCache.set(key, { url, expiresAt: Date.now() + CACHE_TTL_MS });
  return url;
}
