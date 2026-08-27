/**
 * Standard 15-character Indian GSTIN format: 2-digit state code, 10-character
 * PAN, 1-digit entity code, the literal 'Z', and a 1-character checksum.
 * Format-only — does not verify the checksum digit or call the GST
 * portal, same "shape validation, not a live lookup" scope as
 * INDIAN_MOBILE_REGEX next to it.
 */
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const INVALID_GSTIN_MESSAGE = 'Enter a valid 15-character GSTIN';
