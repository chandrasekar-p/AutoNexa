"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const purchase_order_receiving_1 = require("../src/modules/purchase-orders/purchase-order-receiving");
describe('isOverReceiving', () => {
    it('allows receiving exactly what is outstanding', () => {
        expect((0, purchase_order_receiving_1.isOverReceiving)(10, 0, 10)).toBe(false);
    });
    it('allows receiving less than what is outstanding', () => {
        expect((0, purchase_order_receiving_1.isOverReceiving)(10, 4, 3)).toBe(false);
    });
    it('rejects receiving more than what is outstanding', () => {
        expect((0, purchase_order_receiving_1.isOverReceiving)(10, 4, 7)).toBe(true);
    });
    it('rejects any receipt once the line is already fully received', () => {
        expect((0, purchase_order_receiving_1.isOverReceiving)(10, 10, 1)).toBe(true);
    });
});
describe('rollupPurchaseOrderStatus', () => {
    it('returns RECEIVED when every item is fully received', () => {
        const status = (0, purchase_order_receiving_1.rollupPurchaseOrderStatus)([
            { quantityOrdered: 10, quantityReceived: 10 },
            { quantityOrdered: 5, quantityReceived: 5 },
        ]);
        expect(status).toBe(client_1.PurchaseOrderStatus.RECEIVED);
    });
    it('returns PARTIALLY_RECEIVED when at least one item is short', () => {
        const status = (0, purchase_order_receiving_1.rollupPurchaseOrderStatus)([
            { quantityOrdered: 10, quantityReceived: 10 },
            { quantityOrdered: 5, quantityReceived: 2 },
        ]);
        expect(status).toBe(client_1.PurchaseOrderStatus.PARTIALLY_RECEIVED);
    });
    it('returns PARTIALLY_RECEIVED when nothing has been received yet', () => {
        const status = (0, purchase_order_receiving_1.rollupPurchaseOrderStatus)([{ quantityOrdered: 10, quantityReceived: 0 }]);
        expect(status).toBe(client_1.PurchaseOrderStatus.PARTIALLY_RECEIVED);
    });
});
//# sourceMappingURL=purchase-order-receiving.spec.js.map