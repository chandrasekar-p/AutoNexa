import { PurchaseOrderStatus } from '@prisma/client';
import {
  PURCHASE_ORDER_STATUS_TRANSITIONS,
  isValidPurchaseOrderTransition,
} from '../src/modules/purchase-orders/purchase-order-status-transitions';

describe('isValidPurchaseOrderTransition', () => {
  it('allows sending a draft order', () => {
    expect(isValidPurchaseOrderTransition(PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.SENT)).toBe(true);
  });

  it('allows cancelling from DRAFT, SENT, or PARTIALLY_RECEIVED', () => {
    expect(isValidPurchaseOrderTransition(PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.CANCELLED)).toBe(true);
    expect(isValidPurchaseOrderTransition(PurchaseOrderStatus.SENT, PurchaseOrderStatus.CANCELLED)).toBe(true);
    expect(isValidPurchaseOrderTransition(PurchaseOrderStatus.PARTIALLY_RECEIVED, PurchaseOrderStatus.CANCELLED)).toBe(true);
  });

  it('rejects cancelling an already-fully-received order', () => {
    expect(isValidPurchaseOrderTransition(PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED)).toBe(false);
  });

  it('rejects reviving a cancelled order', () => {
    for (const to of Object.values(PurchaseOrderStatus)) {
      expect(isValidPurchaseOrderTransition(PurchaseOrderStatus.CANCELLED, to)).toBe(false);
    }
  });

  it('rejects moving a sent order back to draft', () => {
    expect(isValidPurchaseOrderTransition(PurchaseOrderStatus.SENT, PurchaseOrderStatus.DRAFT)).toBe(false);
  });

  it('treats RECEIVED and CANCELLED as terminal — zero allowed transitions out', () => {
    expect(PURCHASE_ORDER_STATUS_TRANSITIONS[PurchaseOrderStatus.RECEIVED]).toHaveLength(0);
    expect(PURCHASE_ORDER_STATUS_TRANSITIONS[PurchaseOrderStatus.CANCELLED]).toHaveLength(0);
  });
});
