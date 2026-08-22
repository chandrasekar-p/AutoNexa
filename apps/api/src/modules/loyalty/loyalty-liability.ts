import { Prisma } from '@prisma/client';

type Decimalish = Prisma.Decimal | number | string;

/**
 * GET /reports/loyalty-liability's headline number: total outstanding
 * points across every customer, converted to rupees at the current
 * redemption rate — i.e. the future discount exposure if every point on
 * the books were redeemed tomorrow. Not a formal accounting liability
 * entry, same "computed, explicitly-scoped number" honesty as
 * profit-margin.ts's calculateTotalMargin.
 */
export function calculateLoyaltyLiability(balances: number[], pointValueRupees: Decimalish): Prisma.Decimal {
  const totalPoints = balances.reduce((sum, balance) => sum + balance, 0);
  return new Prisma.Decimal(totalPoints).mul(pointValueRupees).toDecimalPlaces(2);
}
