"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adjustLoyaltyBalance = adjustLoyaltyBalance;
const common_1 = require("@nestjs/common");
async function adjustLoyaltyBalance(tx, customerId, delta, entry) {
    if (delta < 0) {
        const updated = await tx.customer.updateMany({
            where: { id: customerId, loyaltyPointsBalance: { gte: -delta } },
            data: { loyaltyPointsBalance: { decrement: -delta } },
        });
        if (updated.count === 0)
            throw new common_1.BadRequestException('Requested points exceed the customer\'s loyalty balance');
    }
    else {
        await tx.customer.update({ where: { id: customerId }, data: { loyaltyPointsBalance: { increment: delta } } });
    }
    const customer = await tx.customer.findUniqueOrThrow({ where: { id: customerId } });
    await tx.loyaltyTransaction.create({
        data: {
            customerId,
            points: delta,
            balanceAfter: customer.loyaltyPointsBalance,
            ...entry,
        },
    });
}
//# sourceMappingURL=loyalty-ledger.js.map