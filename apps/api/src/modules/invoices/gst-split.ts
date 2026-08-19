import { Prisma } from '@prisma/client';

type Decimalish = Prisma.Decimal | number | string;

export interface GstSplitLineItem {
  lineTotal: Decimalish;
  gstRate: Decimalish;
}

export interface GstSplit {
  subtotal: Prisma.Decimal;
  cgstAmount: Prisma.Decimal;
  sgstAmount: Prisma.Decimal;
  igstAmount: Prisma.Decimal;
}

export interface RoundOff {
  roundOff: Prisma.Decimal;
  grandTotal: Prisma.Decimal;
}

/**
 * CGST+SGST vs IGST split for an Invoice, computed from each line's own
 * `lineTotal`/`gstRate` (never re-derived from a live Part/LabourItem
 * lookup — the caller is expected to pass already-snapshotted line data).
 * Pure and DB-free, mirrors resolve-converted-labour-line.ts's approach.
 *
 * Same state (tenant home state === customer state): half the line's GST
 * as CGST, half as SGST. Different state: the full line GST as IGST.
 *
 * Fallback when either state is unset: treated as SAME-STATE (CGST+SGST).
 * This is the safer operational default for a single-location Indian
 * workshop, whose customer base is typically local — silently defaulting
 * to IGST instead would be the more surprising failure mode. Tenants
 * should still set TenantSettings.state for GST accuracy (see the README);
 * this fallback exists so a missing setting produces a usable invoice
 * rather than blocking generation outright.
 */
export function calculateGstSplit(
  lineItems: GstSplitLineItem[],
  tenantState: string | null | undefined,
  customerState: string | null | undefined,
): GstSplit {
  const isInterState =
    !!tenantState && !!customerState && tenantState.trim().toLowerCase() !== customerState.trim().toLowerCase();

  let subtotal = new Prisma.Decimal(0);
  let cgstAmount = new Prisma.Decimal(0);
  let sgstAmount = new Prisma.Decimal(0);
  let igstAmount = new Prisma.Decimal(0);

  for (const item of lineItems) {
    const lineTotal = new Prisma.Decimal(item.lineTotal);
    const lineGst = lineTotal.mul(item.gstRate).div(100);
    subtotal = subtotal.add(lineTotal);

    if (isInterState) {
      igstAmount = igstAmount.add(lineGst);
    } else {
      const half = lineGst.div(2);
      cgstAmount = cgstAmount.add(half);
      sgstAmount = sgstAmount.add(half);
    }
  }

  return {
    subtotal: subtotal.toDecimalPlaces(2),
    cgstAmount: cgstAmount.toDecimalPlaces(2),
    sgstAmount: sgstAmount.toDecimalPlaces(2),
    igstAmount: igstAmount.toDecimalPlaces(2),
  };
}

/** Rounds to the nearest whole rupee; roundOff = rounded - unrounded. */
export function computeRoundOff(unroundedGrandTotal: Decimalish): RoundOff {
  const unrounded = new Prisma.Decimal(unroundedGrandTotal);
  const rounded = unrounded.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
  return {
    roundOff: rounded.sub(unrounded).toDecimalPlaces(2),
    grandTotal: rounded.toDecimalPlaces(2),
  };
}
