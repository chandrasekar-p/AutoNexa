import { InvoiceStatus } from '@prisma/client';
import { computeInvoiceOutstanding, sumOutstanding } from '../src/common/billing/outstanding';

describe('computeInvoiceOutstanding', () => {
  it('returns the full grandTotal when nothing has been paid', () => {
    const outstanding = computeInvoiceOutstanding({ grandTotal: 1712, payments: [] });
    expect(outstanding.toString()).toBe('1712');
  });

  it('subtracts the sum of payments from grandTotal', () => {
    const outstanding = computeInvoiceOutstanding({
      grandTotal: 1712,
      payments: [{ amount: 712 }, { amount: 500 }],
    });
    expect(outstanding.toString()).toBe('500');
  });

  it('returns zero once payments meet grandTotal', () => {
    const outstanding = computeInvoiceOutstanding({ grandTotal: 1712, payments: [{ amount: 1712 }] });
    expect(outstanding.toString()).toBe('0');
  });
});

describe('sumOutstanding', () => {
  it('sums only UNPAID/PARTIALLY_PAID invoices, ignoring PAID ones', () => {
    const total = sumOutstanding([
      { status: InvoiceStatus.UNPAID, outstanding: 1000 },
      { status: InvoiceStatus.PARTIALLY_PAID, outstanding: 500 },
      { status: InvoiceStatus.PAID, outstanding: 0 },
    ]);
    expect(total.toString()).toBe('1500');
  });

  it('ignores REFUNDED invoices too', () => {
    const total = sumOutstanding([
      { status: InvoiceStatus.REFUNDED, outstanding: 200 },
      { status: InvoiceStatus.UNPAID, outstanding: 300 },
    ]);
    expect(total.toString()).toBe('300');
  });

  it('returns zero for an empty list', () => {
    expect(sumOutstanding([]).toString()).toBe('0');
  });
});
