"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLowStock = isLowStock;
exports.derivePartStockStatus = derivePartStockStatus;
function isLowStock(part) {
    return part.currentStock <= part.minStock;
}
function derivePartStockStatus(part) {
    if (part.currentStock <= 0)
        return 'out_of_stock';
    if (isLowStock(part))
        return 'low_stock';
    return 'in_stock';
}
//# sourceMappingURL=low-stock.js.map