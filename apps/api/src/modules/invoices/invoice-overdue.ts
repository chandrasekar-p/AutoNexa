import { InvoiceStatus, Prisma } from '@prisma/client';

/**
 * OVERDUE is an operational overlay on UNPAID/PARTIALLY_PAID, not a
 * stored InvoiceStatus value — computed fresh on every read from
 * Invoice.dueDate, same "computed status, never persisted" discipline as
 * computeJobCardDelayStatus/deriveTechnicianAvailability/
 * derivePartStockStatus this session. Never overrides PAID/REFUNDED — a
 * settled invoice is settled regardless of how late it eventually was.
 */
export type InvoiceDisplayStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED' | 'OVERDUE';

export const INVOICE_DISPLAY_STATUSES: InvoiceDisplayStatus[] = ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED', 'OVERDUE'];

const SETTLED_STATUSES: InvoiceStatus[] = [InvoiceStatus.PAID, InvoiceStatus.REFUNDED];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function deriveInvoiceDisplayStatus(
  status: InvoiceStatus,
  dueDate: Date | null,
  now: Date = new Date(),
): InvoiceDisplayStatus {
  if (SETTLED_STATUSES.includes(status)) return status as InvoiceDisplayStatus;
  if (dueDate && startOfDay(dueDate) < startOfDay(now)) return 'OVERDUE';
  return status as InvoiceDisplayStatus;
}

/** Whole calendar days past due — only meaningful once deriveInvoiceDisplayStatus returns OVERDUE. */
export function computeOverdueDays(dueDate: Date, now: Date = new Date()): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((startOfDay(now).getTime() - startOfDay(dueDate).getTime()) / msPerDay));
}

/**
 * The aggregate/filter mirror of deriveInvoiceDisplayStatus, expressed as
 * real Prisma where-filters — kept in sync with that function's
 * precedence by hand since Prisma can't run arbitrary JS inside a
 * findMany()/count() query. UNPAID/PARTIALLY_PAID here mean "in that raw
 * status AND not overdue" so the Unpaid and Overdue tabs/KPIs never
 * double-count the same invoice, mirroring the non-overlapping-buckets
 * convention used for Job Cards/Technicians/Parts this session.
 */
export function invoiceDisplayStatusWhere(displayStatus: InvoiceDisplayStatus, now: Date = new Date()): Prisma.InvoiceWhereInput {
  const cutoff = startOfDay(now);
  switch (displayStatus) {
    case 'PAID':
      return { status: InvoiceStatus.PAID };
    case 'REFUNDED':
      return { status: InvoiceStatus.REFUNDED };
    case 'OVERDUE':
      return { status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID] }, dueDate: { lt: cutoff } };
    case 'UNPAID':
      return { status: InvoiceStatus.UNPAID, OR: [{ dueDate: null }, { dueDate: { gte: cutoff } }] };
    case 'PARTIALLY_PAID':
      return { status: InvoiceStatus.PARTIALLY_PAID, OR: [{ dueDate: null }, { dueDate: { gte: cutoff } }] };
  }
}
