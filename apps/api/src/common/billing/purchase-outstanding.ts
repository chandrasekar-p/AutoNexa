import { Prisma, PurchaseInvoiceStatus } from '@prisma/client';

type Decimalish = Prisma.Decimal | number | string;

export interface PurchaseInvoiceForOutstanding {
  total: Decimalish;
  payments: { amount: Decimalish }[];
}

/**
 * outstanding = total - sum(payments), for one PurchaseInvoice. Parallel to
 * outstanding.ts's computeInvoiceOutstanding for the customer-facing
 * Invoice model — kept separate rather than generalized over both because
 * PurchaseInvoice/PurchaseInvoiceStatus are a distinct model/enum from
 * Invoice/InvoiceStatus, not just a naming difference.
 */
export function computePurchaseInvoiceOutstanding(invoice: PurchaseInvoiceForOutstanding): Prisma.Decimal {
  const paid = invoice.payments.reduce((sum, p) => sum.add(p.amount), new Prisma.Decimal(0));
  return new Prisma.Decimal(invoice.total).sub(paid).toDecimalPlaces(2);
}

/**
 * Sums `outstanding` across only UNPAID/PARTIALLY_PAID purchase invoices —
 * shared by reports.service.ts's tenant-wide supplierOutstanding() and
 * suppliers.service.ts's per-supplier findOne() stats, so the two can
 * never disagree on one supplier's payable balance.
 */
export function sumPurchaseOutstanding<T extends { status: PurchaseInvoiceStatus; outstanding: Decimalish }>(
  invoices: T[],
): Prisma.Decimal {
  return invoices
    .filter((inv) => inv.status === PurchaseInvoiceStatus.UNPAID || inv.status === PurchaseInvoiceStatus.PARTIALLY_PAID)
    .reduce((sum, inv) => sum.add(inv.outstanding), new Prisma.Decimal(0));
}
