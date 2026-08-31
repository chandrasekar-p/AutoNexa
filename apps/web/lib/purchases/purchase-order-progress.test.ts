import { describe, expect, it } from 'vitest';
import { computePurchaseOrderProgress } from './purchase-order-progress';

describe('computePurchaseOrderProgress', () => {
  it('is only "ordered" for a fresh DRAFT order with no receipts/invoices', () => {
    const progress = computePurchaseOrderProgress({ status: 'DRAFT', goodsReceipts: [] }, []);
    expect(progress).toEqual({ ordered: true, goodsReceived: false, invoiced: false, paid: false, cancelled: false });
  });

  it('marks goodsReceived once at least one receipt exists', () => {
    const progress = computePurchaseOrderProgress(
      { status: 'PARTIALLY_RECEIVED', goodsReceipts: [{ id: '1', receivedById: null, receivedAt: '', notes: null, items: [] }] },
      [],
    );
    expect(progress.goodsReceived).toBe(true);
    expect(progress.invoiced).toBe(false);
  });

  it('marks invoiced once an invoice exists, and paid only once a payment is recorded', () => {
    const unpaidInvoice = { status: 'UNPAID' as const, payments: [] };
    const withInvoiceOnly = computePurchaseOrderProgress({ status: 'RECEIVED', goodsReceipts: [] }, [unpaidInvoice]);
    expect(withInvoiceOnly.invoiced).toBe(true);
    expect(withInvoiceOnly.paid).toBe(false);

    const paidInvoice = { status: 'PARTIALLY_PAID' as const, payments: [{ id: 'p1', purchaseInvoiceId: 'i1', amount: '100', paymentDate: '', method: 'cash', referenceNumber: null, createdAt: '' }] };
    const withPayment = computePurchaseOrderProgress({ status: 'RECEIVED', goodsReceipts: [] }, [paidInvoice]);
    expect(withPayment.paid).toBe(true);
  });

  it('keeps progress already made when the order is cancelled, and flags cancelled', () => {
    const progress = computePurchaseOrderProgress(
      { status: 'CANCELLED', goodsReceipts: [{ id: '1', receivedById: null, receivedAt: '', notes: null, items: [] }] },
      [],
    );
    expect(progress.cancelled).toBe(true);
    expect(progress.goodsReceived).toBe(true);
    expect(progress.invoiced).toBe(false);
  });
});
