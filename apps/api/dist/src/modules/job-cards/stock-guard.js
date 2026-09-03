"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasSufficientStock = hasSufficientStock;
const client_1 = require("@prisma/client");
function hasSufficientStock(currentStock, requestedQuantity) {
    return new client_1.Prisma.Decimal(requestedQuantity).lte(new client_1.Prisma.Decimal(currentStock));
}
//# sourceMappingURL=stock-guard.js.map