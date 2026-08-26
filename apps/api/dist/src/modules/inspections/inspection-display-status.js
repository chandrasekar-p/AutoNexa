"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INSPECTION_OVERDUE_THRESHOLD_HOURS = exports.INSPECTION_DISPLAY_STATUSES = void 0;
exports.computeInspectionDisplayStatus = computeInspectionDisplayStatus;
exports.computeInspectionDurationMinutes = computeInspectionDurationMinutes;
exports.inspectionDisplayStatusWhere = inspectionDisplayStatusWhere;
const client_1 = require("@prisma/client");
exports.INSPECTION_DISPLAY_STATUSES = [
    'IN_PROGRESS',
    'PENDING_REVIEW',
    'OVERDUE',
    'COMPLETED',
];
exports.INSPECTION_OVERDUE_THRESHOLD_HOURS = 24;
function overdueCutoff(now) {
    return new Date(now.getTime() - exports.INSPECTION_OVERDUE_THRESHOLD_HOURS * 60 * 60 * 1000);
}
function computeInspectionDisplayStatus(inspection, now = new Date()) {
    if (inspection.status === client_1.InspectionStatus.COMPLETED)
        return 'COMPLETED';
    if (inspection.createdAt <= overdueCutoff(now))
        return 'OVERDUE';
    const hasUncheckedItem = inspection.items.length === 0 || inspection.items.some((i) => i.result === client_1.InspectionResult.NOT_CHECKED);
    return hasUncheckedItem ? 'IN_PROGRESS' : 'PENDING_REVIEW';
}
function computeInspectionDurationMinutes(createdAt, completedAt, now = new Date()) {
    const end = completedAt ?? now;
    return Math.max(0, Math.round((end.getTime() - createdAt.getTime()) / 60000));
}
function inspectionDisplayStatusWhere(displayStatus, now = new Date()) {
    const cutoff = overdueCutoff(now);
    switch (displayStatus) {
        case 'COMPLETED':
            return { status: client_1.InspectionStatus.COMPLETED };
        case 'OVERDUE':
            return { status: client_1.InspectionStatus.IN_PROGRESS, createdAt: { lte: cutoff } };
        case 'PENDING_REVIEW':
            return {
                status: client_1.InspectionStatus.IN_PROGRESS,
                createdAt: { gt: cutoff },
                AND: [{ items: { some: {} } }, { items: { none: { result: client_1.InspectionResult.NOT_CHECKED } } }],
            };
        case 'IN_PROGRESS':
            return {
                status: client_1.InspectionStatus.IN_PROGRESS,
                createdAt: { gt: cutoff },
                OR: [{ items: { none: {} } }, { items: { some: { result: client_1.InspectionResult.NOT_CHECKED } } }],
            };
    }
}
//# sourceMappingURL=inspection-display-status.js.map