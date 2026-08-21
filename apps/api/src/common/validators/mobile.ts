/**
 * Indian mobile number: optional +91/0 prefix, then 10 digits starting
 * 6-9, with an optional single space/hyphen right after the prefix and
 * another in the middle — matches how CreateCustomerDto's own Swagger
 * example ("+91 98765 43210") is formatted, not just a bare 10-digit string.
 */
export const INDIAN_MOBILE_REGEX = /^(?:\+91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}$/;
export const INVALID_MOBILE_MESSAGE = 'Enter a valid 10-digit mobile number';
