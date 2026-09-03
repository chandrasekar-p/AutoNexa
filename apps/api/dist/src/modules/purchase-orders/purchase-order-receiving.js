"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isOverReceiving = isOverReceiving;
exports.rollupPurchaseOrderStatus = rollupPurchaseOrderStatus;
const client_1 = require("@prisma/client");
function isOverReceiving(quantityOrdered, quantityReceived, quantityReceivingNow) {
    const outstanding = new client_1.Prisma.Decimal(quantityOrdered).sub(quantityReceived);
    return new client_1.Prisma.Decimal(quantityReceivingNow).gt(outstanding);
}
function rollupPurchaseOrderStatus(items) {
    const fullyReceived = items.every((item) => new client_1.Prisma.Decimal(item.quantityReceived).gte(item.quantityOrdered));
    return fullyReceived ? client_1.PurchaseOrderStatus.RECEIVED : client_1.PurchaseOrderStatus.PARTIALLY_RECEIVED;
}
//# sourceMappingURL=purchase-order-receiving.js.map