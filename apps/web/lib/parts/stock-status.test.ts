import { describe, expect, it } from 'vitest';
import { derivePartStockStatus } from './stock-status';

describe('derivePartStockStatus', () => {
  it('is out_of_stock at zero, even when minStock is also zero', () => {
    expect(derivePartStockStatus({ currentStock: 0, minStock: 0 })).toBe('out_of_stock');
    expect(derivePartStockStatus({ currentStock: 0, minStock: 5 })).toBe('out_of_stock');
  });

  it('is low_stock when positive but at or below minStock', () => {
    expect(derivePartStockStatus({ currentStock: 5, minStock: 5 })).toBe('low_stock');
    expect(derivePartStockStatus({ currentStock: 2, minStock: 5 })).toBe('low_stock');
  });

  it('is in_stock when above minStock', () => {
    expect(derivePartStockStatus({ currentStock: 6, minStock: 5 })).toBe('in_stock');
  });

  it('compares fractional Decimal-string quantities numerically, not lexicographically', () => {
    // "9.5" <= "10.25" is false as a string comparison but true numerically —
    // this is exactly the bug this function must not have once currentStock/
    // minStock arrive from the API as Decimal strings.
    expect(derivePartStockStatus({ currentStock: '9.500', minStock: '10.250' })).toBe('low_stock');
    expect(derivePartStockStatus({ currentStock: '5.500', minStock: '5.500' })).toBe('low_stock');
    expect(derivePartStockStatus({ currentStock: '5.501', minStock: '5.500' })).toBe('in_stock');
  });
});
