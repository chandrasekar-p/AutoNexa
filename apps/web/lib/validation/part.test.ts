import { describe, expect, it } from 'vitest';
import { validatePartForm } from './part';

describe('validatePartForm', () => {
  it('accepts a minimal valid payload', () => {
    const result = validatePartForm({
      partNumber: 'PN-10234',
      sku: 'SKU-BRK-001',
      name: 'Front brake pad set',
      purchasePrice: 800,
      sellingPrice: 1200,
      gstRate: 18,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing partNumber, sku, or name', () => {
    const result = validatePartForm({ partNumber: '', sku: '', name: '', purchasePrice: 0, sellingPrice: 0, gstRate: 18 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.partNumber).toBeDefined();
      expect(result.errors.sku).toBeDefined();
      expect(result.errors.name).toBeDefined();
    }
  });

  it('rejects a negative purchase or selling price', () => {
    const result = validatePartForm({
      partNumber: 'PN-1',
      sku: 'SKU-1',
      name: 'Part',
      purchasePrice: -1,
      sellingPrice: -1,
      gstRate: 18,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.purchasePrice).toBeDefined();
      expect(result.errors.sellingPrice).toBeDefined();
    }
  });

  it('normalizes blank optional strings and NaN numbers to undefined', () => {
    const result = validatePartForm({
      partNumber: 'PN-1',
      sku: 'SKU-1',
      name: 'Part',
      purchasePrice: 100,
      sellingPrice: 150,
      gstRate: 18,
      categoryId: '',
      hsnCode: '',
      minStock: NaN,
      maxStock: NaN,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.categoryId).toBeUndefined();
      expect(result.data.hsnCode).toBeUndefined();
      expect(result.data.minStock).toBeUndefined();
      expect(result.data.maxStock).toBeUndefined();
    }
  });
});
