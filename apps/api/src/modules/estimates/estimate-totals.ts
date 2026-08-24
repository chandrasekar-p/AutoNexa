import { Prisma } from '@prisma/client';

type Decimalish = Prisma.Decimal | number | string;

export interface EstimateTotalsLineItem {
  quantity: Decimalish;
  unitPrice: Decimalish;
  gstRate: Decimalish;
}

export interface EstimateTotals {
  subtotal: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  total: Prisma.Decimal;
}

/**
 * quantity × unitPrice, rounded to 2 decimal places — this is what gets
 * stored as EstimateLineItem.lineTotal. GST is aggregated separately onto
 * the parent Estimate, not stored per line.
 */
export function calculateLineTotal(quantity: Decimalish, unitPrice: Decimalish): Prisma.Decimal {
  return new Prisma.Decimal(quantity).mul(unitPrice).toDecimalPlaces(2);
}

/**
 * Server-side source of truth for an Estimate's subtotal/tax/total — never
 * trust a client-supplied total. Pure function (no DB access) so it's
 * unit-testable on its own; the service calls this after every line-item
 * add/update/remove and persists the result.
 */
export function calculateEstimateTotals(
  lineItems: EstimateTotalsLineItem[],
  discountAmount: Decimalish = 0,
): EstimateTotals {
  let subtotal = new Prisma.Decimal(0);
  let taxAmount = new Prisma.Decimal(0);

  for (const item of lineItems) {
    const lineTotal = calculateLineTotal(item.quantity, item.unitPrice);
    subtotal = subtotal.add(lineTotal);
    taxAmount = taxAmount.add(lineTotal.mul(item.gstRate).div(100));
  }

  subtotal = subtotal.toDecimalPlaces(2);
  taxAmount = taxAmount.toDecimalPlaces(2);
  // Clamped at 0 — a discount larger than subtotal+tax must not flip the
  // estimate into an amount owed to the customer.
  const total = Prisma.Decimal.max(0, subtotal.add(taxAmount).sub(new Prisma.Decimal(discountAmount))).toDecimalPlaces(2);

  return { subtotal, taxAmount, total };
}
