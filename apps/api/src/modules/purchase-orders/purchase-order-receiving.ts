import { Prisma, PurchaseOrderStatus } from '@prisma/client';

type DecimalInput = number | string | Prisma.Decimal;

export interface PurchaseOrderItemReceiptState {
  quantityOrdered: DecimalInput;
  quantityReceived: DecimalInput;
}

/**
 * True when `quantityReceivingNow` exceeds what's still outstanding on a
 * PurchaseOrderItem line (ordered minus already received). Pure so the
 * over-receiving rejection is unit-testable without a DB.
 *
 * Decimal-safe (all three quantities are Decimal(10,3)) — never native
 * `-`/`>` on the raw values.
 */
export function isOverReceiving(
  quantityOrdered: DecimalInput,
  quantityReceived: DecimalInput,
  quantityReceivingNow: DecimalInput,
): boolean {
  const outstanding = new Prisma.Decimal(quantityOrdered).sub(quantityReceived);
  return new Prisma.Decimal(quantityReceivingNow).gt(outstanding);
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
  const fullyReceived = items.every((item) => new Prisma.Decimal(item.quantityReceived).gte(item.quantityOrdered));
  return fullyReceived ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIALLY_RECEIVED;
}
