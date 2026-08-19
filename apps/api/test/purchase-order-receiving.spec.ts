import { PurchaseOrderStatus } from '@prisma/client';
import { isOverReceiving, rollupPurchaseOrderStatus } from '../src/modules/purchase-orders/purchase-order-receiving';

describe('isOverReceiving', () => {
  it('allows receiving exactly what is outstanding', () => {
    expect(isOverReceiving(10, 0, 10)).toBe(false);
  });

  it('allows receiving less than what is outstanding', () => {
    expect(isOverReceiving(10, 4, 3)).toBe(false);
  });

  it('rejects receiving more than what is outstanding', () => {
    expect(isOverReceiving(10, 4, 7)).toBe(true);
  });

  it('rejects any receipt once the line is already fully received', () => {
    expect(isOverReceiving(10, 10, 1)).toBe(true);
  });
});

describe('rollupPurchaseOrderStatus', () => {
  it('returns RECEIVED when every item is fully received', () => {
    const status = rollupPurchaseOrderStatus([
      { quantityOrdered: 10, quantityReceived: 10 },
      { quantityOrdered: 5, quantityReceived: 5 },
    ]);
    expect(status).toBe(PurchaseOrderStatus.RECEIVED);
  });

  it('returns PARTIALLY_RECEIVED when at least one item is short', () => {
    const status = rollupPurchaseOrderStatus([
      { quantityOrdered: 10, quantityReceived: 10 },
      { quantityOrdered: 5, quantityReceived: 2 },
    ]);
    expect(status).toBe(PurchaseOrderStatus.PARTIALLY_RECEIVED);
  });

  it('returns PARTIALLY_RECEIVED when nothing has been received yet', () => {
    const status = rollupPurchaseOrderStatus([{ quantityOrdered: 10, quantityReceived: 0 }]);
    expect(status).toBe(PurchaseOrderStatus.PARTIALLY_RECEIVED);
  });
});
