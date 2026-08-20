"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLowStock = isLowStock;
function isLowStock(part) {
    return part.currentStock <= part.minStock;
}
//# sourceMappingURL=low-stock.js.map