"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STOCK_ADJUSTMENT_REASONS = void 0;
exports.mapAdjustmentReasonToTxnType = mapAdjustmentReasonToTxnType;
exports.computeAdjustmentDelta = computeAdjustmentDelta;
exports.formatAdjustmentNotes = formatAdjustmentNotes;
const client_1 = require("@prisma/client");
exports.STOCK_ADJUSTMENT_REASONS = [
    'PURCHASE_RECEIVED',
    'PART_USED',
    'DAMAGED',
    'RETURNED',
    'MANUAL_CORRECTION',
    'WARRANTY_REPLACEMENT',
    'OTHER',
];
const REASON_LABEL = {
    PURCHASE_RECEIVED: 'Purchase Received',
    PART_USED: 'Part Used',
    DAMAGED: 'Damaged',
    RETURNED: 'Returned',
    MANUAL_CORRECTION: 'Manual Correction',
    WARRANTY_REPLACEMENT: 'Warranty Replacement',
    OTHER: 'Other',
};
function mapAdjustmentReasonToTxnType(reason) {
    switch (reason) {
        case 'DAMAGED':
            return client_1.InventoryTxnType.DAMAGED;
        case 'RETURNED':
            return client_1.InventoryTxnType.RETURN;
        default:
            return client_1.InventoryTxnType.ADJUSTMENT;
    }
}
function computeAdjustmentDelta(direction, quantity) {
    return direction === 'IN' ? quantity : -quantity;
}
function formatAdjustmentNotes(reason, notes) {
    return notes ? `${REASON_LABEL[reason]} — ${notes}` : REASON_LABEL[reason];
}
//# sourceMappingURL=part-stock-adjustment.js.map