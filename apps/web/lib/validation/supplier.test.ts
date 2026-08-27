import { describe, expect, it } from 'vitest';
import { validateSupplierForm } from './supplier';

describe('validateSupplierForm', () => {
  it('accepts a name-only payload', () => {
    const result = validateSupplierForm({ name: 'Bosch Distributors' });
    expect(result.success).toBe(true);
  });

  it('rejects a missing name', () => {
    const result = validateSupplierForm({ name: '' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.name).toBeDefined();
  });

  it('rejects a malformed mobile but accepts a blank one', () => {
    const bad = validateSupplierForm({ name: 'Bosch', mobile: '12345' });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.errors.mobile).toBeDefined();

    const blank = validateSupplierForm({ name: 'Bosch', mobile: '' });
    expect(blank.success).toBe(true);
  });

  it('rejects a malformed email but accepts a blank one', () => {
    const bad = validateSupplierForm({ name: 'Bosch', email: 'not-an-email' });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.errors.email).toBeDefined();

    const blank = validateSupplierForm({ name: 'Bosch', email: '' });
    expect(blank.success).toBe(true);
  });

  it('rejects a malformed GSTIN but accepts a blank one', () => {
    const bad = validateSupplierForm({ name: 'Bosch', gstin: '12345' });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.errors.gstin).toBeDefined();

    const good = validateSupplierForm({ name: 'Bosch', gstin: '33AAAAA0000A1Z5' });
    expect(good.success).toBe(true);

    const blank = validateSupplierForm({ name: 'Bosch', gstin: '' });
    expect(blank.success).toBe(true);
  });

  it('normalizes blank optional fields to undefined', () => {
    const result = validateSupplierForm({ name: 'Bosch', gstin: '', paymentTerms: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gstin).toBeUndefined();
      expect(result.data.paymentTerms).toBeUndefined();
    }
  });
});
