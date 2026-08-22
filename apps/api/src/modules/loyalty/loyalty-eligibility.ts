import { Prisma } from '@prisma/client';

type Decimalish = Prisma.Decimal | number | string;

/**
 * Fast-fail predicate mirroring stock-guard.ts's hasSufficientStock — the
 * real concurrency safety net is the guarded UPDATE on
 * Customer.loyaltyPointsBalance in loyalty.service.ts
 * (`WHERE loyaltyPointsBalance >= requested`), not this function.
 */
export function hasSufficientPoints(balance: number, requested: number): boolean {
  return requested >= 0 && requested <= balance;
}

/**
 * Points earned on a paid invoice — floor, not round, so a customer never
 * earns a fractional-point's worth more than TenantSettings.loyaltyPointsPerRupee
 * strictly entitles them to. Computed on `subtotal` (what was actually
 * spent on goods/services), not `grandTotal` (which includes tax paid to
 * the government, not to the workshop).
 */
export function computePointsEarned(subtotal: Decimalish, pointsPerRupee: Decimalish): number {
  return new Prisma.Decimal(subtotal).mul(pointsPerRupee).floor().toNumber();
}

/** Rupee value of a points redemption — capped by the caller against the invoice's own subtotal before this is ever applied (see invoices/discount.ts). */
export function computeRedemptionValue(points: number, pointValueRupees: Decimalish): Prisma.Decimal {
  return new Prisma.Decimal(points).mul(pointValueRupees).toDecimalPlaces(2);
}
