import { Prisma, PurchaseInvoiceStatus } from '@prisma/client';

type Decimalish = Prisma.Decimal | number | string;

/**
 * PurchaseInvoice status from sum-of-payments vs total — same "recompute
 * the status from source data, never store it as the source of truth"
 * discipline as Estimate's totals and JobCard's status pipeline. Pure and
 * DB-free.
 */
export function rollupPurchaseInvoiceStatus(totalPaid: Decimalish, invoiceTotal: Decimalish): PurchaseInvoiceStatus {
  const paid = new Prisma.Decimal(totalPaid);
  const total = new Prisma.Decimal(invoiceTotal);

  if (total.gt(0) && paid.gte(total)) return PurchaseInvoiceStatus.PAID;
  if (paid.gt(0)) return PurchaseInvoiceStatus.PARTIALLY_PAID;
  return PurchaseInvoiceStatus.UNPAID;
}
