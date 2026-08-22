import { applyProRataDiscount } from '../src/modules/invoices/discount';
import { calculateGstSplit } from '../src/modules/invoices/gst-split';

describe('applyProRataDiscount', () => {
  it('leaves line items untouched when there is no discount', () => {
    const lines = [{ lineTotal: 1000, gstRate: 18 }];
    expect(applyProRataDiscount(lines, 0)).toEqual(lines);
  });

  it('splits the discount proportionally across lines of different sizes', () => {
    const lines = [
      { lineTotal: 800, gstRate: 18 },
      { lineTotal: 200, gstRate: 28 },
    ];
    const result = applyProRataDiscount(lines, 100);
    // 800/1000 share of ₹100 = ₹80; 200/1000 share = ₹20.
    expect(result[0]!.lineTotal.toNumber()).toBe(720);
    expect(result[1]!.lineTotal.toNumber()).toBe(180);
  });

  it('the sum of prorated shares always equals the discount exactly, no rounding drift', () => {
    // Three lines whose shares don't divide evenly — the last line absorbs the remainder.
    const lines = [
      { lineTotal: 333, gstRate: 18 },
      { lineTotal: 333, gstRate: 18 },
      { lineTotal: 334, gstRate: 18 },
    ];
    const result = applyProRataDiscount(lines, 100);
    const totalAfter = result.reduce((sum, r) => sum + r.lineTotal.toNumber(), 0);
    const totalBefore = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    expect(totalBefore - totalAfter).toBeCloseTo(100, 2);
  });

  it('is a no-op on an empty line item list', () => {
    expect(applyProRataDiscount([], 100)).toEqual([]);
  });

  /**
   * The core correctness requirement: a discount must reduce the TAXABLE
   * value before GST is computed (pre-tax), not be subtracted from an
   * already-taxed total — see the architecture doc's reasoning on why
   * this differs from Estimate's existing post-tax discountAmount.
   */
  it('reduces GST payable, proving the discount is applied pre-tax', () => {
    const lines = [{ lineTotal: 1000, gstRate: 18 }];
    const withoutDiscount = calculateGstSplit(lines, 'Tamil Nadu', 'Tamil Nadu');
    const discounted = applyProRataDiscount(lines, 200);
    const withDiscount = calculateGstSplit(discounted, 'Tamil Nadu', 'Tamil Nadu');

    // Full ₹1000 at 18%: ₹180 GST. After a ₹200 pre-tax discount, taxable
    // value is ₹800, so GST should be ₹144 — not ₹180 minus some post-tax
    // adjustment.
    const totalGstBefore = withoutDiscount.cgstAmount.add(withoutDiscount.sgstAmount);
    const totalGstAfter = withDiscount.cgstAmount.add(withDiscount.sgstAmount);
    expect(totalGstBefore.toNumber()).toBe(180);
    expect(totalGstAfter.toNumber()).toBe(144);
  });
});
