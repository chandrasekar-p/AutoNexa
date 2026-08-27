import { InventoryTxnType } from '@prisma/client';

export type StockAdjustmentDirection = 'IN' | 'OUT';

export const STOCK_ADJUSTMENT_REASONS = [
  'PURCHASE_RECEIVED',
  'PART_USED',
  'DAMAGED',
  'RETURNED',
  'MANUAL_CORRECTION',
  'WARRANTY_REPLACEMENT',
  'OTHER',
] as const;
export type StockAdjustmentReason = (typeof STOCK_ADJUSTMENT_REASONS)[number];

const REASON_LABEL: Record<StockAdjustmentReason, string> = {
  PURCHASE_RECEIVED: 'Purchase Received',
  PART_USED: 'Part Used',
  DAMAGED: 'Damaged',
  RETURNED: 'Returned',
  MANUAL_CORRECTION: 'Manual Correction',
  WARRANTY_REPLACEMENT: 'Warranty Replacement',
  OTHER: 'Other',
};

/**
 * PURCHASE_IN/JOB_CARD_CONSUMPTION stay reserved for their real automated
 * flows (PurchaseOrdersService receiving, JobCardsService.addPart) so the
 * ledger never has to guess whether a row came from an actual
 * receipt/job card or a manual override typed in here — a manual "Purchase
 * Received" or "Part Used" entry (e.g. a counter sale with no job card
 * behind it) still lands as ADJUSTMENT, with the reason preserved in
 * notes. DAMAGED/RETURNED map 1:1 onto their own dedicated enum values
 * since those are unambiguous regardless of who recorded them.
 */
export function mapAdjustmentReasonToTxnType(reason: StockAdjustmentReason): InventoryTxnType {
  switch (reason) {
    case 'DAMAGED':
      return InventoryTxnType.DAMAGED;
    case 'RETURNED':
      return InventoryTxnType.RETURN;
    default:
      return InventoryTxnType.ADJUSTMENT;
  }
}

/** Stock In is a positive delta, Stock Out negative — the guarded UPDATE this feeds must never let OUT drive currentStock below zero. */
export function computeAdjustmentDelta(direction: StockAdjustmentDirection, quantity: number): number {
  return direction === 'IN' ? quantity : -quantity;
}

export function formatAdjustmentNotes(reason: StockAdjustmentReason, notes?: string): string {
  return notes ? `${REASON_LABEL[reason]} — ${notes}` : REASON_LABEL[reason];
}
