/**
 * Mirrors the backend's INDIAN_MOBILE_REGEX
 * (apps/api/src/common/validators/mobile.ts) exactly — optional +91/0
 * prefix, 10 digits starting 6-9, an optional single space/hyphen after
 * the prefix and another in the middle (matches "+91 98765 43210").
 */
export const INDIAN_MOBILE_REGEX = /^(?:\+91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}$/;
export const INVALID_MOBILE_MESSAGE = 'Enter a valid 10-digit mobile number';
