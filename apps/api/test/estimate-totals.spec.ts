import { Prisma } from '@prisma/client';
import { calculateEstimateTotals, calculateLineTotal } from '../src/modules/estimates/estimate-totals';

describe('calculateLineTotal', () => {
  it('multiplies quantity by unitPrice', () => {
    const total = calculateLineTotal(2, 499.99);
    expect(total.toString()).toBe('999.98');
  });

  it('rounds a half-cent result to 2 decimal places', () => {
    const total = calculateLineTotal(1, 10.005);
    expect(total.toString()).toBe('10.01');
  });
});

describe('calculateEstimateTotals', () => {
  it('returns zeroed totals for no line items', () => {
    const totals = calculateEstimateTotals([]);
    expect(totals.subtotal.toString()).toBe('0');
    expect(totals.taxAmount.toString()).toBe('0');
    expect(totals.total.toString()).toBe('0');
  });

  it('computes subtotal, GST, and total across multiple lines with mixed GST rates', () => {
    // Labour: 2 hrs x 500 = 1000, 18% GST = 180
    // Part: 1 x 2000 = 2000, 28% GST = 560
    const totals = calculateEstimateTotals([
      { quantity: 2, unitPrice: 500, gstRate: 18 },
      { quantity: 1, unitPrice: 2000, gstRate: 28 },
    ]);

    expect(totals.subtotal.toString()).toBe('3000');
    expect(totals.taxAmount.toString()).toBe('740');
    expect(totals.total.toString()).toBe('3740');
  });

  it('subtracts discountAmount from the total, never trusting a client-supplied total', () => {
    const totals = calculateEstimateTotals([{ quantity: 1, unitPrice: 1000, gstRate: 18 }], 100);

    expect(totals.subtotal.toString()).toBe('1000');
    expect(totals.taxAmount.toString()).toBe('180');
    expect(totals.total.toString()).toBe('1080');
  });

  it('clamps total at 0 when discountAmount exceeds subtotal+tax', () => {
    const totals = calculateEstimateTotals([{ quantity: 1, unitPrice: 1000, gstRate: 18 }], 5000);

    expect(totals.subtotal.toString()).toBe('1000');
    expect(totals.taxAmount.toString()).toBe('180');
    expect(totals.total.toString()).toBe('0');
  });

  it('accepts Prisma.Decimal inputs the same as numbers/strings', () => {
    const totals = calculateEstimateTotals([
      { quantity: new Prisma.Decimal('1.5'), unitPrice: new Prisma.Decimal('200'), gstRate: new Prisma.Decimal('18') },
    ]);

    expect(totals.subtotal.toString()).toBe('300');
    expect(totals.taxAmount.toString()).toBe('54');
    expect(totals.total.toString()).toBe('354');
  });
});
