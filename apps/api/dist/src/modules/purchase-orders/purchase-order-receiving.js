"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOverReceiving = isOverReceiving;
exports.rollupPurchaseOrderStatus = rollupPurchaseOrderStatus;
const client_1 = require("@prisma/client");
function isOverReceiving(quantityOrdered, quantityReceived, quantityReceivingNow) {
    return quantityReceivingNow > quantityOrdered - quantityReceived;
}
function rollupPurchaseOrderStatus(items) {
    const fullyReceived = items.every((item) => item.quantityReceived >= item.quantityOrdered);
    return fullyReceived ? client_1.PurchaseOrderStatus.RECEIVED : client_1.PurchaseOrderStatus.PARTIALLY_RECEIVED;
}
//# sourceMappingURL=purchase-order-receiving.js.map