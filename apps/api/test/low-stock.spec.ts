import { isLowStock, derivePartStockStatus } from '../src/modules/parts/low-stock';

describe('isLowStock', () => {
  it('is true when currentStock is below minStock', () => {
    expect(isLowStock({ currentStock: 2, minStock: 5 })).toBe(true);
  });

  it('is true when currentStock exactly equals minStock', () => {
    expect(isLowStock({ currentStock: 5, minStock: 5 })).toBe(true);
  });

  it('is false when currentStock is above minStock', () => {
    expect(isLowStock({ currentStock: 6, minStock: 5 })).toBe(false);
  });

  it('is true for zero stock against a positive minStock', () => {
    expect(isLowStock({ currentStock: 0, minStock: 1 })).toBe(true);
  });

  it('is true for zero stock even when minStock is also zero — <= includes equality', () => {
    expect(isLowStock({ currentStock: 0, minStock: 0 })).toBe(true);
  });

  it('is false just above a fractional minStock threshold', () => {
    expect(isLowStock({ currentStock: '6.000', minStock: '5.500' })).toBe(false);
  });

  it('is true exactly at a fractional minStock threshold', () => {
    expect(isLowStock({ currentStock: '5.500', minStock: '5.500' })).toBe(true);
  });

  it('is true just below a fractional minStock threshold', () => {
    expect(isLowStock({ currentStock: '5.499', minStock: '5.500' })).toBe(true);
  });
});

describe('derivePartStockStatus', () => {
  it('is out_of_stock at zero, even if minStock is also zero — a distinct bucket from low_stock, unlike isLowStock', () => {
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
