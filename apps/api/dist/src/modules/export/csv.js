"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCsvRow = toCsvRow;
exports.toCsv = toCsv;
function csvField(value) {
    const str = String(value);
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
function toCsvRow(fields) {
    return fields.map(csvField).join(',');
}
function toCsv(rows) {
    return rows.map(toCsvRow).join('\n');
}
//# sourceMappingURL=csv.js.map