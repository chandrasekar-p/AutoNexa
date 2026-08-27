import { deriveInvoiceDisplayStatus, computeOverdueDays, invoiceDisplayStatusWhere } from '../src/modules/invoices/invoice-overdue';

// Local-time Date constructors throughout (month is 0-indexed) — matching
// the function's own local-calendar-day comparison and avoiding
// UTC-string/local-timezone boundary flakiness across test-runner timezones.
const NOW = new Date(2026, 7, 27, 12, 0, 0);

describe('deriveInvoiceDisplayStatus', () => {
  it('is PAID regardless of how overdue the due date was', () => {
    expect(deriveInvoiceDisplayStatus('PAID', new Date(2026, 6, 1), NOW)).toBe('PAID');
  });

  it('is REFUNDED regardless of due date', () => {
    expect(deriveInvoiceDisplayStatus('REFUNDED', new Date(2026, 6, 1), NOW)).toBe('REFUNDED');
  });

  it('is OVERDUE when UNPAID and the due date has passed', () => {
    expect(deriveInvoiceDisplayStatus('UNPAID', new Date(2026, 7, 26), NOW)).toBe('OVERDUE');
  });

  it('is OVERDUE when PARTIALLY_PAID and the due date has passed', () => {
    expect(deriveInvoiceDisplayStatus('PARTIALLY_PAID', new Date(2026, 7, 20), NOW)).toBe('OVERDUE');
  });

  it('is not OVERDUE on the due date itself (still today, not yet passed)', () => {
    expect(deriveInvoiceDisplayStatus('UNPAID', new Date(2026, 7, 27), NOW)).toBe('UNPAID');
  });

  it('stays UNPAID/PARTIALLY_PAID when the due date is in the future', () => {
    expect(deriveInvoiceDisplayStatus('UNPAID', new Date(2026, 7, 30), NOW)).toBe('UNPAID');
    expect(deriveInvoiceDisplayStatus('PARTIALLY_PAID', new Date(2026, 7, 30), NOW)).toBe('PARTIALLY_PAID');
  });

  it('is never OVERDUE when there is no due date at all', () => {
    expect(deriveInvoiceDisplayStatus('UNPAID', null, NOW)).toBe('UNPAID');
  });
});

describe('computeOverdueDays', () => {
  it('counts whole calendar days past due', () => {
    expect(computeOverdueDays(new Date(2026, 7, 24), NOW)).toBe(3);
  });

  it('is 0 on the due date itself', () => {
    expect(computeOverdueDays(new Date(2026, 7, 27), NOW)).toBe(0);
  });

  it('never returns negative for a future due date', () => {
    expect(computeOverdueDays(new Date(2026, 7, 30), NOW)).toBe(0);
  });
});

describe('invoiceDisplayStatusWhere', () => {
  it('OVERDUE matches UNPAID/PARTIALLY_PAID with a past due date', () => {
    const where = invoiceDisplayStatusWhere('OVERDUE', NOW) as { status: { in: string[] }; dueDate: { lt: Date } };
    expect(where.status.in).toEqual(['UNPAID', 'PARTIALLY_PAID']);
    expect(where.dueDate.lt.getTime()).toBe(new Date(2026, 7, 27).getTime());
  });

  it('UNPAID excludes overdue ones via an OR on dueDate', () => {
    const where = invoiceDisplayStatusWhere('UNPAID', NOW) as { status: string; OR: unknown[] };
    expect(where.status).toBe('UNPAID');
    expect(where.OR).toHaveLength(2);
  });

  it('PAID and REFUNDED are plain status filters, unaffected by due date', () => {
    expect(invoiceDisplayStatusWhere('PAID', NOW)).toEqual({ status: 'PAID' });
    expect(invoiceDisplayStatusWhere('REFUNDED', NOW)).toEqual({ status: 'REFUNDED' });
  });
});
