"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateComebackRate = aggregateComebackRate;
function aggregateComebackRate(claims, groupBy) {
    const buckets = new Map();
    for (const claim of claims) {
        let key = null;
        let label = 'Unknown';
        if (groupBy === 'technician') {
            key = claim.technicianId;
            label = claim.technicianName ?? 'Unknown';
        }
        else if (groupBy === 'part') {
            key = claim.partId;
            label = claim.partName ?? 'Unknown';
        }
        else if (groupBy === 'supplier') {
            key = claim.supplierId;
            label = claim.supplierName ?? 'Unknown';
        }
        if (!key)
            continue;
        const existing = buckets.get(key) ?? { label, count: 0 };
        existing.count++;
        buckets.set(key, existing);
    }
    return [...buckets.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.count - a.count);
}
//# sourceMappingURL=comeback-rate.js.map