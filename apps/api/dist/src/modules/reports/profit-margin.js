"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePartMargin = calculatePartMargin;
exports.calculateTotalMargin = calculateTotalMargin;
const client_1 = require("@prisma/client");
function calculatePartMargin(item) {
    return new client_1.Prisma.Decimal(item.sellingPrice).sub(item.purchasePrice).mul(item.quantity).toDecimalPlaces(2);
}
function calculateTotalMargin(partsMargin, labourRevenue) {
    return new client_1.Prisma.Decimal(partsMargin).add(labourRevenue).toDecimalPlaces(2);
}
//# sourceMappingURL=profit-margin.js.map