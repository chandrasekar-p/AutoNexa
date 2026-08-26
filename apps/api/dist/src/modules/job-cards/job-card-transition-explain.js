"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.explainInvalidJobCardTransition = explainInvalidJobCardTransition;
const job_card_status_transitions_1 = require("./job-card-status-transitions");
const STATUS_LABEL = {
    OPEN: 'Open',
    DIAGNOSIS: 'Diagnosis',
    WAITING_APPROVAL: 'Waiting Approval',
    APPROVED: 'Approved',
    IN_PROGRESS: 'In Progress',
    WAITING_PARTS: 'Waiting Parts',
    QUALITY_CHECK: 'Quality Check',
    READY_FOR_DELIVERY: 'Ready for Delivery',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled',
};
function explainInvalidJobCardTransition(from, to) {
    const targetLabel = STATUS_LABEL[to];
    const nextSteps = job_card_status_transitions_1.JOB_CARD_STATUS_TRANSITIONS[from];
    if (nextSteps.length === 0) {
        return `Job cannot be moved to ${targetLabel} — ${STATUS_LABEL[from]} is a final status.`;
    }
    const nextLabels = nextSteps.map((s) => STATUS_LABEL[s]).join(' or ');
    return `Job cannot be moved to ${targetLabel} yet. It must go through ${nextLabels} first.`;
}
//# sourceMappingURL=job-card-transition-explain.js.map