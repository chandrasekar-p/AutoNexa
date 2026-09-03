import { isValidStockBounds } from '../src/modules/parts/part-stock-bounds';

describe('isValidStockBounds', () => {
  it('is valid when minStock is below maxStock', () => {
    expect(isValidStockBounds(5, 10)).toBe(true);
  });

  it('is valid when minStock equals maxStock', () => {
    expect(isValidStockBounds(10, 10)).toBe(true);
  });

  it('is invalid when minStock exceeds maxStock', () => {
    expect(isValidStockBounds(50, 10)).toBe(false);
  });

  it('is valid when there is no maxStock ceiling at all', () => {
    expect(isValidStockBounds(50, null)).toBe(true);
    expect(isValidStockBounds(50, undefined)).toBe(true);
  });

  it('is valid when a fractional minStock is below a fractional maxStock', () => {
    expect(isValidStockBounds('5.500', '10.250')).toBe(true);
  });

  it('is invalid when a fractional minStock exceeds a fractional maxStock by a thousandth', () => {
    expect(isValidStockBounds('10.251', '10.250')).toBe(false);
  });
});
