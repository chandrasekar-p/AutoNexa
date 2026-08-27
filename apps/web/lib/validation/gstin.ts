/**
 * Mirrors the backend's GSTIN_REGEX
 * (apps/api/src/common/validators/gstin.ts) exactly — the standard
 * 15-character GSTIN shape. Format-only, no checksum verification.
 */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const INVALID_GSTIN_MESSAGE = 'Enter a valid 15-character GSTIN';
