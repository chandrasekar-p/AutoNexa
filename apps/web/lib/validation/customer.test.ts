import { describe, expect, it } from 'vitest';
import { validateCustomerForm } from './customer';

describe('validateCustomerForm', () => {
  it('accepts a minimal valid payload (only name + mobile + customerType)', () => {
    const result = validateCustomerForm({
      name: 'Arun Prakash',
      mobile: '9876543210',
      customerType: 'individual',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing name', () => {
    const result = validateCustomerForm({ name: '', mobile: '9876543210', customerType: 'individual' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.name).toBeDefined();
  });

  it('rejects a missing mobile', () => {
    const result = validateCustomerForm({ name: 'Arun', mobile: '', customerType: 'individual' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.mobile).toBeDefined();
  });

  it('rejects a malformed mobile number', () => {
    const result = validateCustomerForm({ name: 'Arun', mobile: '12345', customerType: 'individual' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.mobile).toBeDefined();
  });

  it('rejects a malformed altMobile but accepts an empty one', () => {
    const bad = validateCustomerForm({
      name: 'Arun',
      mobile: '9876543210',
      customerType: 'individual',
      altMobile: '12345',
    });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.errors.altMobile).toBeDefined();

    const blank = validateCustomerForm({
      name: 'Arun',
      mobile: '9876543210',
      customerType: 'individual',
      altMobile: '',
    });
    expect(blank.success).toBe(true);
  });

  it('rejects a malformed email but accepts an empty one', () => {
    const bad = validateCustomerForm({
      name: 'Arun',
      mobile: '9876543210',
      customerType: 'individual',
      email: 'not-an-email',
    });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.errors.email).toBeDefined();

    const blank = validateCustomerForm({
      name: 'Arun',
      mobile: '9876543210',
      customerType: 'individual',
      email: '',
    });
    expect(blank.success).toBe(true);
  });

  it('normalizes blank optional fields to undefined rather than sending empty strings', () => {
    const result = validateCustomerForm({
      name: 'Arun',
      mobile: '9876543210',
      customerType: 'individual',
      gstin: '',
      notes: '',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gstin).toBeUndefined();
      expect(result.data.notes).toBeUndefined();
    }
  });

  it('rejects an invalid customerType', () => {
    const result = validateCustomerForm({ name: 'Arun', mobile: '9876543210', customerType: 'reseller' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.customerType).toBeDefined();
  });
});
