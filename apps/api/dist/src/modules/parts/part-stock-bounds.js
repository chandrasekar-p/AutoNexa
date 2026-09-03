"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidStockBounds = isValidStockBounds;
const client_1 = require("@prisma/client");
function isValidStockBounds(minStock, maxStock) {
    if (maxStock === null || maxStock === undefined)
        return true;
    return new client_1.Prisma.Decimal(minStock).lte(new client_1.Prisma.Decimal(maxStock));
}
//# sourceMappingURL=part-stock-bounds.js.map