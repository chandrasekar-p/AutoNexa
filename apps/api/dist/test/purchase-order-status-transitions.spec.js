"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const purchase_order_status_transitions_1 = require("../src/modules/purchase-orders/purchase-order-status-transitions");
describe('isValidPurchaseOrderTransition', () => {
    it('allows sending a draft order', () => {
        expect((0, purchase_order_status_transitions_1.isValidPurchaseOrderTransition)(client_1.PurchaseOrderStatus.DRAFT, client_1.PurchaseOrderStatus.SENT)).toBe(true);
    });
    it('allows cancelling from DRAFT, SENT, or PARTIALLY_RECEIVED', () => {
        expect((0, purchase_order_status_transitions_1.isValidPurchaseOrderTransition)(client_1.PurchaseOrderStatus.DRAFT, client_1.PurchaseOrderStatus.CANCELLED)).toBe(true);
        expect((0, purchase_order_status_transitions_1.isValidPurchaseOrderTransition)(client_1.PurchaseOrderStatus.SENT, client_1.PurchaseOrderStatus.CANCELLED)).toBe(true);
        expect((0, purchase_order_status_transitions_1.isValidPurchaseOrderTransition)(client_1.PurchaseOrderStatus.PARTIALLY_RECEIVED, client_1.PurchaseOrderStatus.CANCELLED)).toBe(true);
    });
    it('rejects cancelling an already-fully-received order', () => {
        expect((0, purchase_order_status_transitions_1.isValidPurchaseOrderTransition)(client_1.PurchaseOrderStatus.RECEIVED, client_1.PurchaseOrderStatus.CANCELLED)).toBe(false);
    });
    it('rejects reviving a cancelled order', () => {
        for (const to of Object.values(client_1.PurchaseOrderStatus)) {
            expect((0, purchase_order_status_transitions_1.isValidPurchaseOrderTransition)(client_1.PurchaseOrderStatus.CANCELLED, to)).toBe(false);
        }
    });
    it('rejects moving a sent order back to draft', () => {
        expect((0, purchase_order_status_transitions_1.isValidPurchaseOrderTransition)(client_1.PurchaseOrderStatus.SENT, client_1.PurchaseOrderStatus.DRAFT)).toBe(false);
    });
    it('treats RECEIVED and CANCELLED as terminal — zero allowed transitions out', () => {
        expect(purchase_order_status_transitions_1.PURCHASE_ORDER_STATUS_TRANSITIONS[client_1.PurchaseOrderStatus.RECEIVED]).toHaveLength(0);
        expect(purchase_order_status_transitions_1.PURCHASE_ORDER_STATUS_TRANSITIONS[client_1.PurchaseOrderStatus.CANCELLED]).toHaveLength(0);
    });
});
//# sourceMappingURL=purchase-order-status-transitions.spec.js.map