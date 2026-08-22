"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeServiceDue = computeServiceDue;
function computeServiceDue(lastService, currentOdometer, intervalMonths, intervalKm) {
    if (!lastService) {
        return { dueDate: null, dueByOdometer: false };
    }
    const dueDate = new Date(lastService.completedAt);
    dueDate.setMonth(dueDate.getMonth() + intervalMonths);
    const dueByOdometer = currentOdometer !== null && lastService.odometer !== null && currentOdometer - lastService.odometer >= intervalKm;
    return { dueDate, dueByOdometer };
}
//# sourceMappingURL=next-service-due.js.map