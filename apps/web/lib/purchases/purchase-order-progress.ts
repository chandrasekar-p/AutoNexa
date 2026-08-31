import type { PurchaseInvoice, PurchaseOrderDetail } from '@/lib/api-types';

export interface PurchaseOrderProgress {
  ordered: boolean;
  goodsReceived: boolean;
  invoiced: boolean;
  paid: boolean;
  /** True once the order is CANCELLED — the remaining, not-yet-reached steps are "stopped", not just "pending". */
  cancelled: boolean;
}

/**
 * Derives the 4-stage Ordered → Goods Received → Purchase Invoice →
 * Supplier Payment workflow position from data the detail page already
 * has — never stored, so it can't drift from the PO/invoices it reflects.
 * Cancellation doesn't erase progress already made (a partially-received,
 * then-cancelled order still shows Goods Received as done) — it just
 * marks the workflow as stopped going forward.
 */
export function computePurchaseOrderProgress(
  po: Pick<PurchaseOrderDetail, 'status' | 'goodsReceipts'>,
  invoices: Pick<PurchaseInvoice, 'status' | 'payments'>[],
): PurchaseOrderProgress {
  const goodsReceived = po.goodsReceipts.length > 0;
  const invoiced = invoices.length > 0;
  const paid = invoices.some((inv) => inv.payments.length > 0);

  return {
    ordered: true,
    goodsReceived,
    invoiced,
    paid,
    cancelled: po.status === 'CANCELLED',
  };
}
