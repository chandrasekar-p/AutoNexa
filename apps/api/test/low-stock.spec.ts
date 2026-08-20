import { isLowStock } from '../src/modules/parts/low-stock';

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
});
