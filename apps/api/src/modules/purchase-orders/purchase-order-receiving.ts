import { PurchaseOrderStatus } from '@prisma/client';

export interface PurchaseOrderItemReceiptState {
  quantityOrdered: number;
  quantityReceived: number;
}

/**
 * True when `quantityReceivingNow` exceeds what's still outstanding on a
 * PurchaseOrderItem line (ordered minus already received). Pure so the
 * over-receiving rejection is unit-testable without a DB.
 */
export function isOverReceiving(
  quantityOrdered: number,
  quantityReceived: number,
  quantityReceivingNow: number,
): boolean {
  return quantityReceivingNow > quantityOrdered - quantityReceived;
}

/**
 * Rolls up a PurchaseOrder's status from its items' received-vs-ordered
 * quantities, after a receiving transaction has booked new quantities.
 * Pure and DB-free — mirrors job-card-status-transitions.ts's approach.
 * Only ever called from the receive flow, so it only ever needs to decide
 * between PARTIALLY_RECEIVED and RECEIVED — DRAFT/SENT/CANCELLED are
 * manual transitions the caller controls elsewhere.
 */
export function rollupPurchaseOrderStatus(items: PurchaseOrderItemReceiptState[]): PurchaseOrderStatus {
  const fullyReceived = items.every((item) => item.quantityReceived >= item.quantityOrdered);
  return fullyReceived ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIALLY_RECEIVED;
}
