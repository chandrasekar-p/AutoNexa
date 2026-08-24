"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeSalesSummary = computeSalesSummary;
exports.previousPeriodRange = previousPeriodRange;
const client_1 = require("@prisma/client");
function periodKey(date, groupBy) {
    const iso = date.toISOString();
    return groupBy === 'day' ? iso.slice(0, 10) : iso.slice(0, 7);
}
function distinctVehicleCount(entries) {
    return new Set(entries.map((e) => e.vehicleId).filter((id) => id !== null)).size;
}
function computeKpis(entries) {
    const totalSales = entries.reduce((sum, e) => sum.add(e.amount), new client_1.Prisma.Decimal(0)).toDecimalPlaces(2);
    const totalInvoices = entries.length;
    return {
        totalSales,
        totalInvoices,
        carsServiced: distinctVehicleCount(entries),
        averageInvoiceValue: totalInvoices > 0 ? totalSales.dividedBy(totalInvoices).toDecimalPlaces(2) : new client_1.Prisma.Decimal(0),
    };
}
function computeSalesSummary(current, previous, groupBy) {
    const grouped = new Map();
    for (const entry of current) {
        const period = periodKey(entry.date, groupBy);
        const list = grouped.get(period) ?? [];
        list.push(entry);
        grouped.set(period, list);
    }
    const buckets = [...grouped.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, entries]) => {
        const total = entries.reduce((sum, e) => sum.add(e.amount), new client_1.Prisma.Decimal(0)).toDecimalPlaces(2);
        const invoiceCount = entries.length;
        return {
            period,
            invoiceCount,
            carsServiced: distinctVehicleCount(entries),
            total,
            averageInvoice: invoiceCount > 0 ? total.dividedBy(invoiceCount).toDecimalPlaces(2) : new client_1.Prisma.Decimal(0),
        };
    });
    const highestBucket = buckets.reduce((max, row) => (max === null || row.total.greaterThan(max.total) ? row : max), null);
    return {
        buckets,
        kpis: {
            ...computeKpis(current),
            highestDay: highestBucket ? { period: highestBucket.period, total: highestBucket.total } : null,
        },
        previousKpis: computeKpis(previous),
    };
}
function previousPeriodRange(from, to) {
    const spanMs = to.getTime() - from.getTime();
    const previousTo = new Date(from.getTime() - 1);
    const previousFrom = new Date(previousTo.getTime() - spanMs);
    return { from: previousFrom, to: previousTo };
}
//# sourceMappingURL=sales-summary.js.map