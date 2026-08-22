import { Prisma } from '@prisma/client';
import { GstSplitLineItem } from './gst-split';

type Decimalish = Prisma.Decimal | number | string;

/**
 * Reduces each line's taxable value proportionally to its share of the
 * pre-discount subtotal, so a loyalty-points discount reduces GST payable
 * (the correct pre-tax treatment) rather than being subtracted after tax
 * is computed on the full amount. Deliberately a pre-processing step, not
 * a change to gst-split.ts's calculateGstSplit — that function is called
 * afterwards on the already-adjusted line items, completely unmodified.
 *
 * Precondition: `discountAmount` must already be <= the sum of every
 * line's lineTotal — callers (invoices.service.ts) are responsible for
 * capping a points redemption at the invoice's own subtotal before
 * calling this; it does not clamp or validate that itself, so a caller
 * bug that overshoots would produce a negative line total rather than
 * being silently absorbed here.
 */
type WithDecimalLineTotal<T> = Omit<T, 'lineTotal'> & { lineTotal: Prisma.Decimal };

// Return type is always Decimal-typed lineTotal regardless of the input's
// own lineTotal type (Decimalish accepts number/string/Decimal) — the
// function always normalizes through `new Prisma.Decimal(...)` internally,
// so declaring the return shape this way (rather than a generic passthrough
// T[]) reflects what actually comes back at runtime.
export function applyProRataDiscount<T extends GstSplitLineItem>(lineItems: T[], discountAmount: Decimalish): WithDecimalLineTotal<T>[] {
  const discount = new Prisma.Decimal(discountAmount);
  if (discount.lte(0) || lineItems.length === 0) return lineItems as WithDecimalLineTotal<T>[];

  const total = lineItems.reduce((sum, item) => sum.add(item.lineTotal), new Prisma.Decimal(0));
  if (total.lte(0)) return lineItems as WithDecimalLineTotal<T>[];

  let allocated = new Prisma.Decimal(0);
  return lineItems.map((item, index) => {
    const itemTotal = new Prisma.Decimal(item.lineTotal);
    const isLast = index === lineItems.length - 1;
    // The last line absorbs the rounding remainder so the sum of prorated
    // shares always equals discountAmount exactly, never off by a paisa.
    const share = isLast ? discount.sub(allocated) : itemTotal.div(total).mul(discount).toDecimalPlaces(2);
    allocated = allocated.add(share);
    return { ...item, lineTotal: itemTotal.sub(share).toDecimalPlaces(2) };
  });
}
