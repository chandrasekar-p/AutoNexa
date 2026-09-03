"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLowStock = isLowStock;
exports.derivePartStockStatus = derivePartStockStatus;
const client_1 = require("@prisma/client");
function isLowStock(part) {
    return new client_1.Prisma.Decimal(part.currentStock).lte(new client_1.Prisma.Decimal(part.minStock));
}
function derivePartStockStatus(part) {
    if (new client_1.Prisma.Decimal(part.currentStock).lte(0))
        return 'out_of_stock';
    if (isLowStock(part))
        return 'low_stock';
    return 'in_stock';
}
//# sourceMappingURL=low-stock.js.map