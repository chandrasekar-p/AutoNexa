"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bucketSales = bucketSales;
const client_1 = require("@prisma/client");
function bucketSales(entries, groupBy) {
    const buckets = new Map();
    for (const entry of entries) {
        const iso = entry.date.toISOString();
        const period = groupBy === 'day' ? iso.slice(0, 10) : iso.slice(0, 7);
        const running = buckets.get(period) ?? new client_1.Prisma.Decimal(0);
        buckets.set(period, running.add(entry.amount));
    }
    return [...buckets.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, total]) => ({ period, total: total.toDecimalPlaces(2) }));
}
//# sourceMappingURL=sales-bucketing.js.map