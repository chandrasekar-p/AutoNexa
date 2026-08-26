"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeJobCardDelayStatus = computeJobCardDelayStatus;
exports.computeJobCardDelayDays = computeJobCardDelayDays;
const client_1 = require("@prisma/client");
const TERMINAL_STATUSES = [client_1.JobCardStatus.DELIVERED, client_1.JobCardStatus.CANCELLED];
function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function computeJobCardDelayStatus(expectedDelivery, status, now = new Date()) {
    if (!expectedDelivery || TERMINAL_STATUSES.includes(status))
        return null;
    const today = startOfDay(now);
    const dueDay = startOfDay(expectedDelivery);
    if (dueDay.getTime() < today.getTime())
        return 'DELAYED';
    if (dueDay.getTime() === today.getTime())
        return 'DUE_TODAY';
    return 'ON_TRACK';
}
function computeJobCardDelayDays(expectedDelivery, now = new Date()) {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.max(0, Math.floor((startOfDay(now).getTime() - startOfDay(expectedDelivery).getTime()) / msPerDay));
}
//# sourceMappingURL=job-card-delay.js.map