import { Prisma, PurchaseInvoiceStatus } from '@prisma/client';
import { rollupPurchaseInvoiceStatus } from '../src/modules/purchase-invoices/purchase-invoice-status';

describe('rollupPurchaseInvoiceStatus', () => {
  it('returns UNPAID when nothing has been paid', () => {
    expect(rollupPurchaseInvoiceStatus(0, 5900)).toBe(PurchaseInvoiceStatus.UNPAID);
  });

  it('returns PARTIALLY_PAID when some but not all has been paid', () => {
    expect(rollupPurchaseInvoiceStatus(2000, 5900)).toBe(PurchaseInvoiceStatus.PARTIALLY_PAID);
  });

  it('returns PAID once payments meet the total', () => {
    expect(rollupPurchaseInvoiceStatus(5900, 5900)).toBe(PurchaseInvoiceStatus.PAID);
  });

  it('returns PAID on an overpayment', () => {
    expect(rollupPurchaseInvoiceStatus(6000, 5900)).toBe(PurchaseInvoiceStatus.PAID);
  });

  it('accepts Prisma.Decimal inputs the same as numbers', () => {
    const status = rollupPurchaseInvoiceStatus(new Prisma.Decimal('5900'), new Prisma.Decimal('5900'));
    expect(status).toBe(PurchaseInvoiceStatus.PAID);
  });

  it('does not treat a zero-total invoice as PAID', () => {
    expect(rollupPurchaseInvoiceStatus(0, 0)).toBe(PurchaseInvoiceStatus.UNPAID);
  });
});
