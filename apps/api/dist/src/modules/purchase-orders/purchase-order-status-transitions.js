"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PURCHASE_ORDER_STATUS_TRANSITIONS = void 0;
exports.isValidPurchaseOrderTransition = isValidPurchaseOrderTransition;
const client_1 = require("@prisma/client");
exports.PURCHASE_ORDER_STATUS_TRANSITIONS = {
    [client_1.PurchaseOrderStatus.DRAFT]: [client_1.PurchaseOrderStatus.SENT, client_1.PurchaseOrderStatus.CANCELLED],
    [client_1.PurchaseOrderStatus.SENT]: [client_1.PurchaseOrderStatus.CANCELLED],
    [client_1.PurchaseOrderStatus.PARTIALLY_RECEIVED]: [client_1.PurchaseOrderStatus.CANCELLED],
    [client_1.PurchaseOrderStatus.RECEIVED]: [],
    [client_1.PurchaseOrderStatus.CANCELLED]: [],
};
function isValidPurchaseOrderTransition(from, to) {
    return exports.PURCHASE_ORDER_STATUS_TRANSITIONS[from].includes(to);
}
//# sourceMappingURL=purchase-order-status-transitions.js.map