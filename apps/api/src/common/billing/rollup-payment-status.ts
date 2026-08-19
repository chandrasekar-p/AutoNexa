import { Prisma } from '@prisma/client';

type Decimalish = Prisma.Decimal | number | string;

export interface PaymentStatusValues<T> {
  unpaid: T;
  partiallyPaid: T;
  paid: T;
}

/**
 * Sum-of-payments-vs-total rollup, shared by every "an amount owed, paid
 * off over one or more payments" entity in this codebase (PurchaseInvoice,
 * Invoice, …) — same "recompute the status from source data, never store
 * it as the source of truth" discipline as Estimate's totals and JobCard's
 * status pipeline. Pure and DB-free.
 *
 * Generic over the status enum's values rather than importing a specific
 * Prisma enum: PurchaseInvoiceStatus and InvoiceStatus are distinct
 * generated types that happen to share the same three states — passing
 * them in via `statuses` lets one function serve both without either
 * duplicating this arithmetic or coupling to one entity's enum.
 */
export function rollupPaymentStatus<T>(
  totalPaid: Decimalish,
  total: Decimalish,
  statuses: PaymentStatusValues<T>,
): T {
  const paid = new Prisma.Decimal(totalPaid);
  const grandTotal = new Prisma.Decimal(total);

  if (grandTotal.gt(0) && paid.gte(grandTotal)) return statuses.paid;
  if (paid.gt(0)) return statuses.partiallyPaid;
  return statuses.unpaid;
}
