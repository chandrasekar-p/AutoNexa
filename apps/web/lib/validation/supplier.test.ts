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

  it('rejects a malformed email but accepts a blank one', () => {
    const bad = validateSupplierForm({ name: 'Bosch', email: 'not-an-email' });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.errors.email).toBeDefined();

    const blank = validateSupplierForm({ name: 'Bosch', email: '' });
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
