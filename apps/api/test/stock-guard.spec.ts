import { hasSufficientStock } from '../src/modules/job-cards/stock-guard';

describe('hasSufficientStock', () => {
  it('allows a request exactly equal to current stock', () => {
    expect(hasSufficientStock(5, 5)).toBe(true);
  });

  it('allows a request below current stock', () => {
    expect(hasSufficientStock(5, 3)).toBe(true);
  });

  it('rejects a request exceeding current stock', () => {
    expect(hasSufficientStock(5, 6)).toBe(false);
  });

  it('rejects any request against zero stock', () => {
    expect(hasSufficientStock(0, 1)).toBe(false);
  });

  it('allows a fractional request exactly equal to fractional current stock', () => {
    expect(hasSufficientStock('5.500', '5.500')).toBe(true);
  });

  it('allows a fractional request below fractional current stock', () => {
    expect(hasSufficientStock('50.500', '2.750')).toBe(true);
  });

  it('rejects a fractional request exceeding fractional current stock', () => {
    expect(hasSufficientStock('2.500', '2.501')).toBe(false);
  });

  it('is precise at the smallest supported increment (0.001)', () => {
    expect(hasSufficientStock('1.001', '1.001')).toBe(true);
    expect(hasSufficientStock('1.000', '1.001')).toBe(false);
  });
});
