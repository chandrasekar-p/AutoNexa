"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidStockBounds = isValidStockBounds;
function isValidStockBounds(minStock, maxStock) {
    if (maxStock === null || maxStock === undefined)
        return true;
    return minStock <= maxStock;
}
//# sourceMappingURL=part-stock-bounds.js.map