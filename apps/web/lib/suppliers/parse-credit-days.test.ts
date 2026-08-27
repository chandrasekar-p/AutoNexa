import { describe, expect, it } from 'vitest';
import { parseCreditDays } from './parse-credit-days';

describe('parseCreditDays', () => {
  it('parses standard "Net N" values', () => {
    expect(parseCreditDays('Net 30')).toBe(30);
    expect(parseCreditDays('Net 15')).toBe(15);
    expect(parseCreditDays('net45')).toBe(45);
  });

  it('returns null for null, undefined, or blank', () => {
    expect(parseCreditDays(null)).toBeNull();
    expect(parseCreditDays(undefined)).toBeNull();
    expect(parseCreditDays('')).toBeNull();
  });

  it('returns null for an unparseable custom value', () => {
    expect(parseCreditDays('Cash on Delivery')).toBeNull();
    expect(parseCreditDays('50% advance')).toBeNull();
  });
});
