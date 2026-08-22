import { calculateLoyaltyLiability } from '../src/modules/loyalty/loyalty-liability';

describe('calculateLoyaltyLiability', () => {
  it('sums every customer\'s balance and converts at the redemption rate', () => {
    expect(calculateLoyaltyLiability([100, 50, 200], 1).toNumber()).toBe(350);
  });

  it('applies a non-1 point value correctly', () => {
    expect(calculateLoyaltyLiability([100, 100], 0.5).toNumber()).toBe(100);
  });

  it('is zero when no customer has a balance', () => {
    expect(calculateLoyaltyLiability([], 1).toNumber()).toBe(0);
  });
});
