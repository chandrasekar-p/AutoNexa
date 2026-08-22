import { Prisma } from '@prisma/client';
import { calculateGstSplit } from '../invoices/gst-split';

type Decimalish = Prisma.Decimal | number | string;

export interface GstrLineItemInput {
  hsnSac: string | null;
  gstRate: Decimalish;
  lineTotal: Decimalish; // taxable (pre-tax) value for this line
  quantity: Decimalish;
}

export interface GstrInvoiceInput {
  invoiceNumber: string;
  invoiceDate: Date;
  grandTotal: Decimalish;
  customerGstin: string | null;
  customerState: string | null;
  lineItems: GstrLineItemInput[];
}

export interface B2bRow {
  gstin: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceValue: Prisma.Decimal;
  rate: string;
  taxableValue: Prisma.Decimal;
  igstAmount: Prisma.Decimal;
  cgstAmount: Prisma.Decimal;
  sgstAmount: Prisma.Decimal;
}

export interface B2cSummaryRow {
  placeOfSupply: string;
  rate: string;
  taxableValue: Prisma.Decimal;
  igstAmount: Prisma.Decimal;
  cgstAmount: Prisma.Decimal;
  sgstAmount: Prisma.Decimal;
}

export interface HsnSummaryRow {
  hsnSac: string;
  rate: string;
  totalQuantity: Prisma.Decimal;
  taxableValue: Prisma.Decimal;
  igstAmount: Prisma.Decimal;
  cgstAmount: Prisma.Decimal;
  sgstAmount: Prisma.Decimal;
}

interface LineSplit {
  taxableValue: Prisma.Decimal;
  cgstAmount: Prisma.Decimal;
  sgstAmount: Prisma.Decimal;
  igstAmount: Prisma.Decimal;
}

/**
 * Re-derives one line's GST split via the SAME calculateGstSplit() used at
 * invoice-generation time — never a fresh reimplementation of the
 * same-state/inter-state rule — so a GSTR-1 row can never silently disagree
 * with how the invoice itself was taxed. Called once per line rather than
 * once per invoice/bucket, which means each line's split is independently
 * rounded to 2dp before bucket-summing; this can differ from the invoice's
 * own single-pass total by a paisa or two on rare bucket boundaries — the
 * same de-minimis rounding tension every real GSTR-1 filer runs into
 * reconciling rate-wise summaries against invoice totals, not something
 * this export tries to hide.
 */
function splitLine(line: GstrLineItemInput, tenantState: string | null, customerState: string | null): LineSplit {
  const split = calculateGstSplit([{ lineTotal: line.lineTotal, gstRate: line.gstRate }], tenantState, customerState);
  return { taxableValue: split.subtotal, cgstAmount: split.cgstAmount, sgstAmount: split.sgstAmount, igstAmount: split.igstAmount };
}

function rateLabel(rate: Decimalish): string {
  return new Prisma.Decimal(rate).toString();
}

/** Invoice-wise, rate-wise rows for every invoice with a customer GSTIN (B2B). */
export function buildB2bRows(invoices: GstrInvoiceInput[], tenantState: string | null): B2bRow[] {
  const rows: B2bRow[] = [];

  for (const invoice of invoices) {
    if (!invoice.customerGstin) continue;

    const byRate = new Map<string, LineSplit>();
    for (const line of invoice.lineItems) {
      const split = splitLine(line, tenantState, invoice.customerState);
      const key = rateLabel(line.gstRate);
      const existing = byRate.get(key);
      byRate.set(
        key,
        existing
          ? {
              taxableValue: existing.taxableValue.add(split.taxableValue),
              cgstAmount: existing.cgstAmount.add(split.cgstAmount),
              sgstAmount: existing.sgstAmount.add(split.sgstAmount),
              igstAmount: existing.igstAmount.add(split.igstAmount),
            }
          : split,
      );
    }

    for (const [rate, split] of byRate.entries()) {
      rows.push({
        gstin: invoice.customerGstin,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate.toISOString().slice(0, 10),
        invoiceValue: new Prisma.Decimal(invoice.grandTotal).toDecimalPlaces(2),
        rate,
        taxableValue: split.taxableValue,
        igstAmount: split.igstAmount,
        cgstAmount: split.cgstAmount,
        sgstAmount: split.sgstAmount,
      });
    }
  }

  return rows;
}

/** Place-of-supply + rate summary (no invoice-wise detail) for invoices with no customer GSTIN (B2C). */
export function buildB2cSummaryRows(invoices: GstrInvoiceInput[], tenantState: string | null): B2cSummaryRow[] {
  const buckets = new Map<string, LineSplit>();

  for (const invoice of invoices) {
    if (invoice.customerGstin) continue;
    const placeOfSupply = invoice.customerState ?? 'UNKNOWN';

    for (const line of invoice.lineItems) {
      const split = splitLine(line, tenantState, invoice.customerState);
      const key = `${placeOfSupply}::${rateLabel(line.gstRate)}`;
      const existing = buckets.get(key);
      buckets.set(
        key,
        existing
          ? {
              taxableValue: existing.taxableValue.add(split.taxableValue),
              cgstAmount: existing.cgstAmount.add(split.cgstAmount),
              sgstAmount: existing.sgstAmount.add(split.sgstAmount),
              igstAmount: existing.igstAmount.add(split.igstAmount),
            }
          : split,
      );
    }
  }

  return [...buckets.entries()].map(([key, split]) => {
    const [placeOfSupply, rate] = key.split('::');
    return { placeOfSupply, rate, ...split };
  });
}

/**
 * HSN/SAC-wise summary across ALL outward supplies (B2B + B2C together —
 * GSTR-1's HSN summary table doesn't distinguish the two). A line with no
 * hsnSac snapshot groups under the explicit "UNSPECIFIED" bucket rather
 * than being dropped — see the architecture note on Part/LabourItem HSN
 * backfill: today, in a freshly-seeded tenant, that bucket can legitimately
 * hold 100% of lines, and this export must still produce a usable file.
 */
export function buildHsnSummaryRows(invoices: GstrInvoiceInput[], tenantState: string | null): HsnSummaryRow[] {
  const buckets = new Map<string, LineSplit & { totalQuantity: Prisma.Decimal }>();

  for (const invoice of invoices) {
    for (const line of invoice.lineItems) {
      const split = splitLine(line, tenantState, invoice.customerState);
      const hsnSac = line.hsnSac ?? 'UNSPECIFIED';
      const key = `${hsnSac}::${rateLabel(line.gstRate)}`;
      const existing = buckets.get(key);
      const quantity = new Prisma.Decimal(line.quantity);
      buckets.set(
        key,
        existing
          ? {
              taxableValue: existing.taxableValue.add(split.taxableValue),
              cgstAmount: existing.cgstAmount.add(split.cgstAmount),
              sgstAmount: existing.sgstAmount.add(split.sgstAmount),
              igstAmount: existing.igstAmount.add(split.igstAmount),
              totalQuantity: existing.totalQuantity.add(quantity),
            }
          : { ...split, totalQuantity: quantity },
      );
    }
  }

  return [...buckets.entries()].map(([key, bucket]) => {
    const [hsnSac, rate] = key.split('::');
    return { hsnSac, rate, ...bucket };
  });
}

/** Count of line items with no HSN/SAC snapshot — surfaced as a data-quality warning, never used to block the export. */
export function countMissingHsn(invoices: GstrInvoiceInput[]): number {
  return invoices.reduce((count, invoice) => count + invoice.lineItems.filter((l) => !l.hsnSac).length, 0);
}
