"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateLoyaltyLiability = calculateLoyaltyLiability;
const client_1 = require("@prisma/client");
function calculateLoyaltyLiability(balances, pointValueRupees) {
    const totalPoints = balances.reduce((sum, balance) => sum + balance, 0);
    return new client_1.Prisma.Decimal(totalPoints).mul(pointValueRupees).toDecimalPlaces(2);
}
//# sourceMappingURL=loyalty-liability.js.map