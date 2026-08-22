import { hasSufficientPoints, computePointsEarned, computeRedemptionValue } from '../src/modules/loyalty/loyalty-eligibility';

describe('hasSufficientPoints', () => {
  it('allows a redemption exactly equal to the balance', () => {
    expect(hasSufficientPoints(100, 100)).toBe(true);
  });

  it('allows a redemption below the balance', () => {
    expect(hasSufficientPoints(100, 50)).toBe(true);
  });

  it('rejects a redemption exceeding the balance', () => {
    expect(hasSufficientPoints(100, 101)).toBe(false);
  });

  it('rejects a negative request', () => {
    expect(hasSufficientPoints(100, -1)).toBe(false);
  });

  it('allows redeeming zero', () => {
    expect(hasSufficientPoints(0, 0)).toBe(true);
  });
});

describe('computePointsEarned', () => {
  it('matches the invoice subtotal at the configured rate', () => {
    // 1 point per ₹100 spent (rate 0.01) on a ₹5,000 subtotal = 50 points.
    expect(computePointsEarned(5000, 0.01)).toBe(50);
  });

  it('floors a fractional result rather than rounding up', () => {
    // ₹4,999 at 0.01/rupee = 49.99 points -> 49, never 50.
    expect(computePointsEarned(4999, 0.01)).toBe(49);
  });

  it('earns zero on a zero subtotal', () => {
    expect(computePointsEarned(0, 0.01)).toBe(0);
  });
});

describe('computeRedemptionValue', () => {
  it('converts points to rupees at the configured rate', () => {
    expect(computeRedemptionValue(50, 1).toNumber()).toBe(50);
    expect(computeRedemptionValue(50, 0.5).toNumber()).toBe(25);
  });
});
