import { InvoiceStatus, Prisma, PurchaseInvoiceStatus } from '@prisma/client';
import { rollupPaymentStatus } from '../src/common/billing/rollup-payment-status';

const PURCHASE_INVOICE_STATUSES = {
  unpaid: PurchaseInvoiceStatus.UNPAID,
  partiallyPaid: PurchaseInvoiceStatus.PARTIALLY_PAID,
  paid: PurchaseInvoiceStatus.PAID,
};

const INVOICE_STATUSES = {
  unpaid: InvoiceStatus.UNPAID,
  partiallyPaid: InvoiceStatus.PARTIALLY_PAID,
  paid: InvoiceStatus.PAID,
};

describe('rollupPaymentStatus — generic across enums (PurchaseInvoiceStatus)', () => {
  it('returns UNPAID when nothing has been paid', () => {
    expect(rollupPaymentStatus(0, 5900, PURCHASE_INVOICE_STATUSES)).toBe(PurchaseInvoiceStatus.UNPAID);
  });

  it('returns PARTIALLY_PAID when some but not all has been paid', () => {
    expect(rollupPaymentStatus(2000, 5900, PURCHASE_INVOICE_STATUSES)).toBe(PurchaseInvoiceStatus.PARTIALLY_PAID);
  });

  it('returns PAID once payments meet the total', () => {
    expect(rollupPaymentStatus(5900, 5900, PURCHASE_INVOICE_STATUSES)).toBe(PurchaseInvoiceStatus.PAID);
  });

  it('returns PAID on an overpayment', () => {
    expect(rollupPaymentStatus(6000, 5900, PURCHASE_INVOICE_STATUSES)).toBe(PurchaseInvoiceStatus.PAID);
  });

  it('accepts Prisma.Decimal inputs the same as numbers', () => {
    const status = rollupPaymentStatus(
      new Prisma.Decimal('5900'),
      new Prisma.Decimal('5900'),
      PURCHASE_INVOICE_STATUSES,
    );
    expect(status).toBe(PurchaseInvoiceStatus.PAID);
  });

  it('does not treat a zero-total invoice as PAID', () => {
    expect(rollupPaymentStatus(0, 0, PURCHASE_INVOICE_STATUSES)).toBe(PurchaseInvoiceStatus.UNPAID);
  });
});

describe('rollupPaymentStatus — the same function, instantiated with the distinct InvoiceStatus enum', () => {
  it('returns UNPAID when nothing has been paid', () => {
    expect(rollupPaymentStatus(0, 11800, INVOICE_STATUSES)).toBe(InvoiceStatus.UNPAID);
  });

  it('returns PARTIALLY_PAID when some but not all has been paid', () => {
    expect(rollupPaymentStatus(5000, 11800, INVOICE_STATUSES)).toBe(InvoiceStatus.PARTIALLY_PAID);
  });

  it('returns PAID once payments meet the total', () => {
    expect(rollupPaymentStatus(11800, 11800, INVOICE_STATUSES)).toBe(InvoiceStatus.PAID);
  });
});
