import { Prisma } from '@prisma/client';

type Decimalish = Prisma.Decimal | number | string;

export interface InvoiceGstLine {
  subtotal: Decimalish;
  cgstAmount: Decimalish;
  sgstAmount: Decimalish;
  igstAmount: Decimalish;
  grandTotal: Decimalish;
}

export interface GstSummaryTotals {
  invoiceCount: number;
  subtotal: Prisma.Decimal;
  cgstAmount: Prisma.Decimal;
  sgstAmount: Prisma.Decimal;
  igstAmount: Prisma.Decimal;
  totalGst: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
}

/**
 * Sums a set of already-taxed Invoice rows into filing-ready totals. Pure
 * and DB-free so it can be shared verbatim between
 * ReportsService.gstSummary() and ExportService's sales GST/Tally export —
 * both fetch invoices with the identical dateRangeWhere() filter and reduce
 * them through this same function, which is what makes "the export and the
 * report must never disagree" true by construction rather than by
 * convention.
 */
export function summarizeInvoiceGst(lines: InvoiceGstLine[]): GstSummaryTotals {
  let subtotal = new Prisma.Decimal(0);
  let cgstAmount = new Prisma.Decimal(0);
  let sgstAmount = new Prisma.Decimal(0);
  let igstAmount = new Prisma.Decimal(0);
  let grandTotal = new Prisma.Decimal(0);

  for (const line of lines) {
    subtotal = subtotal.add(line.subtotal);
    cgstAmount = cgstAmount.add(line.cgstAmount);
    sgstAmount = sgstAmount.add(line.sgstAmount);
    igstAmount = igstAmount.add(line.igstAmount);
    grandTotal = grandTotal.add(line.grandTotal);
  }

  return {
    invoiceCount: lines.length,
    subtotal: subtotal.toDecimalPlaces(2),
    cgstAmount: cgstAmount.toDecimalPlaces(2),
    sgstAmount: sgstAmount.toDecimalPlaces(2),
    igstAmount: igstAmount.toDecimalPlaces(2),
    totalGst: cgstAmount.add(sgstAmount).add(igstAmount).toDecimalPlaces(2),
    grandTotal: grandTotal.toDecimalPlaces(2),
  };
}
