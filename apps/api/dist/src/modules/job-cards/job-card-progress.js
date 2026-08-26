"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOB_CARD_ACTIVE_PROGRESS_STATUSES = void 0;
exports.computeJobCardPipelineProgress = computeJobCardPipelineProgress;
const client_1 = require("@prisma/client");
const PIPELINE_ORDER = [
    client_1.JobCardStatus.OPEN,
    client_1.JobCardStatus.DIAGNOSIS,
    client_1.JobCardStatus.WAITING_APPROVAL,
    client_1.JobCardStatus.APPROVED,
    client_1.JobCardStatus.IN_PROGRESS,
    client_1.JobCardStatus.QUALITY_CHECK,
    client_1.JobCardStatus.READY_FOR_DELIVERY,
    client_1.JobCardStatus.DELIVERED,
];
exports.JOB_CARD_ACTIVE_PROGRESS_STATUSES = [
    client_1.JobCardStatus.IN_PROGRESS,
    client_1.JobCardStatus.WAITING_PARTS,
    client_1.JobCardStatus.QUALITY_CHECK,
];
function computeJobCardPipelineProgress(status) {
    if (status === client_1.JobCardStatus.CANCELLED)
        return null;
    const effectiveStatus = status === client_1.JobCardStatus.WAITING_PARTS ? client_1.JobCardStatus.IN_PROGRESS : status;
    const index = PIPELINE_ORDER.indexOf(effectiveStatus);
    if (index === -1)
        return null;
    return Math.round(((index + 1) / PIPELINE_ORDER.length) * 100);
}
//# sourceMappingURL=job-card-progress.js.map