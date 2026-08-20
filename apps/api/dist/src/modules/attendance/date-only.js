"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.todayDateOnly = todayDateOnly;
exports.dateOnly = dateOnly;
function todayDateOnly(now = new Date()) {
    return dateOnly(now);
}
function dateOnly(value) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}
//# sourceMappingURL=date-only.js.map