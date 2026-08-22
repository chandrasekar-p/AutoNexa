"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDateDedupeKey = buildDateDedupeKey;
exports.buildOdometerDedupeKey = buildOdometerDedupeKey;
exports.shouldSendDateReminder = shouldSendDateReminder;
exports.shouldSendOdometerReminder = shouldSendOdometerReminder;
function isoDate(date) {
    return date.toISOString().slice(0, 10);
}
function buildDateDedupeKey(vehicleId, field, date, thresholdDays) {
    return `${vehicleId}:${field}:${isoDate(date)}:${thresholdDays}d`;
}
function buildOdometerDedupeKey(vehicleId, lastServiceOdometer) {
    return `${vehicleId}:odometer:${lastServiceOdometer}`;
}
function shouldSendDateReminder(input) {
    if (input.optedOut || !input.enabled || input.alreadySent)
        return false;
    if (input.targetDate <= input.now)
        return false;
    const horizon = new Date(input.now.getTime() + input.thresholdDays * 24 * 60 * 60 * 1000);
    return input.targetDate <= horizon;
}
function shouldSendOdometerReminder(input) {
    return input.dueByOdometer && input.enabled && !input.optedOut && !input.alreadySent;
}
//# sourceMappingURL=reminder-eligibility.js.map