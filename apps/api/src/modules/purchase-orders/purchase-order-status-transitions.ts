import { PurchaseOrderStatus } from '@prisma/client';

/**
 * Allowed-transitions map for the subset of statuses a client can actually
 * set via PATCH /purchase-orders/:id — PARTIALLY_RECEIVED/RECEIVED are
 * receive-flow-only (see RECEIVE_FLOW_ONLY_STATUSES in
 * purchase-orders.service.ts) and never appear as a target here, but a
 * purchase order sitting in either of those states can still be manually
 * cancelled (the remaining unfulfilled portion won't be delivered).
 * RECEIVED and CANCELLED are both terminal — same discipline as
 * job-card-status-transitions.ts.
 */
export const PURCHASE_ORDER_STATUS_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  [PurchaseOrderStatus.DRAFT]: [PurchaseOrderStatus.SENT, PurchaseOrderStatus.CANCELLED],
  [PurchaseOrderStatus.SENT]: [PurchaseOrderStatus.CANCELLED],
  [PurchaseOrderStatus.PARTIALLY_RECEIVED]: [PurchaseOrderStatus.CANCELLED],
  [PurchaseOrderStatus.RECEIVED]: [],
  [PurchaseOrderStatus.CANCELLED]: [],
};

export function isValidPurchaseOrderTransition(from: PurchaseOrderStatus, to: PurchaseOrderStatus): boolean {
  return PURCHASE_ORDER_STATUS_TRANSITIONS[from].includes(to);
}
