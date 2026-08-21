"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeColumnTotals = computeColumnTotals;
function computeColumnTotals(rows) {
    if (rows.length === 0)
        return {};
    const keys = Object.keys(rows[0]).filter((k) => k !== 'id');
    const totals = {};
    for (const key of keys) {
        const numericValues = rows.map((row) => toNumeric(row[key]));
        if (numericValues.some((v) => v === null))
            continue;
        totals[key] = numericValues.reduce((sum, v) => sum + v, 0);
    }
    return totals;
}
function toNumeric(value) {
    if (typeof value === 'number')
        return Number.isFinite(value) ? value : null;
    if (value && typeof value.toNumber === 'function') {
        return value.toNumber();
    }
    return null;
}
//# sourceMappingURL=column-totals.js.map