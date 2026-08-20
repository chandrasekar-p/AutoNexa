import { InvoiceStatus, Prisma } from '@prisma/client';

type Decimalish = Prisma.Decimal | number | string;

export interface InvoiceForOutstanding {
  grandTotal: Decimalish;
  payments: { amount: Decimalish }[];
}

/**
 * outstanding = grandTotal - sum(payments). Shared by customers.service.ts
 * (per-customer profile) and reports.service.ts (tenant-wide outstanding
 * report) — extracted here instead of duplicated, same discipline as
 * rollup-payment-status.ts.
 */
export function computeInvoiceOutstanding(invoice: InvoiceForOutstanding): Prisma.Decimal {
  const paid = invoice.payments.reduce((sum, p) => sum.add(p.amount), new Prisma.Decimal(0));
  return new Prisma.Decimal(invoice.grandTotal).sub(paid).toDecimalPlaces(2);
}

/**
 * Sums `outstanding` across only UNPAID/PARTIALLY_PAID invoices — PAID (and
 * REFUNDED) invoices contribute nothing even if their computed outstanding
 * isn't exactly zero (it always should be, by the rollup-payment-status
 * invariant, but filtering explicitly by status is the documented intent
 * rather than relying on that arithmetic coincidence).
 */
export function sumOutstanding<T extends { status: InvoiceStatus; outstanding: Decimalish }>(
  invoices: T[],
): Prisma.Decimal {
  return invoices
    .filter((inv) => inv.status === InvoiceStatus.UNPAID || inv.status === InvoiceStatus.PARTIALLY_PAID)
    .reduce((sum, inv) => sum.add(inv.outstanding), new Prisma.Decimal(0));
}
