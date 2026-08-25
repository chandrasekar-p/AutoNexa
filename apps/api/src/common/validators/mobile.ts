/**
 * Indian mobile number: optional +91/0 prefix, then 10 digits starting
 * 6-9, with an optional single space/hyphen right after the prefix and
 * another in the middle — matches how CreateCustomerDto's own Swagger
 * example ("+91 98765 43210") is formatted, not just a bare 10-digit string.
 */
export const INDIAN_MOBILE_REGEX = /^(?:\+91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}$/;
export const INVALID_MOBILE_MESSAGE = 'Enter a valid 10-digit mobile number';

/**
 * Normalizes any of INDIAN_MOBILE_REGEX's accepted stored shapes
 * ("9092262278", "+91 98765 43210", "098765 43210", ...) into strict
 * E.164 ("+919092262278") — what Twilio's and WhatsApp Cloud API's `to`
 * field actually require. A bare 10-digit number (the common case — no
 * normalization happens at write-time, Customer.mobile stores whatever
 * shape the form was filled in) reaches Twilio unresolved otherwise,
 * which it can't confidently attribute to a region — this is what a
 * "Permission to send an SMS has not been enabled for the region..."
 * error actually meant even after India was enabled in Geo Permissions.
 * Returns the input unchanged if it doesn't match the expected shape, so
 * a genuinely malformed number still fails loudly at the provider
 * (logged FAILED with their own error) rather than being silently
 * swallowed here.
 */
export function toE164(mobile: string): string {
  const digits = mobile.replace(/[\s-]/g, '');
  const match = /^(?:\+91|0)?([6-9]\d{9})$/.exec(digits);
  return match ? `+91${match[1]}` : mobile;
}
