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
});
