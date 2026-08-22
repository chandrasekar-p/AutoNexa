import { describe, expect, it } from 'vitest';
import { validateServicePackageForm } from './service-package';

const VALID = {
  name: 'Annual Maintenance Contract',
  description: '',
  price: '4999',
  gstRate: '18',
  validityMonths: '12',
  visitLimit: '',
  isActive: true,
  labourItemIds: [],
  partIds: [],
  partCategoryIds: [],
};

describe('validateServicePackageForm', () => {
  it('accepts a minimal valid payload with unlimited visits', () => {
    const result = validateServicePackageForm(VALID);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.visitLimit).toBeUndefined();
  });

  it('rejects a missing name', () => {
    const result = validateServicePackageForm({ ...VALID, name: '' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.name).toBeDefined();
  });

  it('rejects a negative price', () => {
    const result = validateServicePackageForm({ ...VALID, price: '-1' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.price).toBeDefined();
  });

  it('rejects a validityMonths of zero', () => {
    const result = validateServicePackageForm({ ...VALID, validityMonths: '0' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.validityMonths).toBeDefined();
  });

  it('accepts a positive integer visit limit', () => {
    const result = validateServicePackageForm({ ...VALID, visitLimit: '4' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.visitLimit).toBe(4);
  });

  it('passes through included item id arrays unchanged', () => {
    const result = validateServicePackageForm({ ...VALID, labourItemIds: ['a'], partIds: ['b'], partCategoryIds: ['c'] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.labourItemIds).toEqual(['a']);
      expect(result.data.partIds).toEqual(['b']);
      expect(result.data.partCategoryIds).toEqual(['c']);
    }
  });
});
