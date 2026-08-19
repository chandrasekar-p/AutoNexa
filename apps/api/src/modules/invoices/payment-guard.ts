import { Prisma } from '@prisma/client';

type Decimalish = Prisma.Decimal | number | string;

/**
 * True when `newPaymentAmount`, added to what's already been paid, would
 * exceed the invoice's `grandTotal`. Pure predicate backing the
 * overpayment rejection on POST /invoices/:id/payments.
 */
export function isOverpayment(
  totalPaidSoFar: Decimalish,
  grandTotal: Decimalish,
  newPaymentAmount: Decimalish,
): boolean {
  const projectedTotal = new Prisma.Decimal(totalPaidSoFar).add(newPaymentAmount);
  return projectedTotal.gt(new Prisma.Decimal(grandTotal));
}
