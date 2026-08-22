"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyProRataDiscount = applyProRataDiscount;
const client_1 = require("@prisma/client");
function applyProRataDiscount(lineItems, discountAmount) {
    const discount = new client_1.Prisma.Decimal(discountAmount);
    if (discount.lte(0) || lineItems.length === 0)
        return lineItems;
    const total = lineItems.reduce((sum, item) => sum.add(item.lineTotal), new client_1.Prisma.Decimal(0));
    if (total.lte(0))
        return lineItems;
    let allocated = new client_1.Prisma.Decimal(0);
    return lineItems.map((item, index) => {
        const itemTotal = new client_1.Prisma.Decimal(item.lineTotal);
        const isLast = index === lineItems.length - 1;
        const share = isLast ? discount.sub(allocated) : itemTotal.div(total).mul(discount).toDecimalPlaces(2);
        allocated = allocated.add(share);
        return { ...item, lineTotal: itemTotal.sub(share).toDecimalPlaces(2) };
    });
}
//# sourceMappingURL=discount.js.map