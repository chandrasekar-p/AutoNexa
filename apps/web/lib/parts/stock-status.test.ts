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
});
