"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOB_CARD_STATUS_TRANSITIONS = void 0;
exports.isValidJobCardTransition = isValidJobCardTransition;
const client_1 = require("@prisma/client");
exports.JOB_CARD_STATUS_TRANSITIONS = {
    [client_1.JobCardStatus.OPEN]: [client_1.JobCardStatus.DIAGNOSIS, client_1.JobCardStatus.CANCELLED],
    [client_1.JobCardStatus.DIAGNOSIS]: [client_1.JobCardStatus.WAITING_APPROVAL, client_1.JobCardStatus.CANCELLED],
    [client_1.JobCardStatus.WAITING_APPROVAL]: [client_1.JobCardStatus.APPROVED, client_1.JobCardStatus.CANCELLED],
    [client_1.JobCardStatus.APPROVED]: [client_1.JobCardStatus.IN_PROGRESS, client_1.JobCardStatus.CANCELLED],
    [client_1.JobCardStatus.IN_PROGRESS]: [
        client_1.JobCardStatus.WAITING_PARTS,
        client_1.JobCardStatus.QUALITY_CHECK,
        client_1.JobCardStatus.CANCELLED,
    ],
    [client_1.JobCardStatus.WAITING_PARTS]: [client_1.JobCardStatus.IN_PROGRESS, client_1.JobCardStatus.CANCELLED],
    [client_1.JobCardStatus.QUALITY_CHECK]: [client_1.JobCardStatus.IN_PROGRESS, client_1.JobCardStatus.READY_FOR_DELIVERY],
    [client_1.JobCardStatus.READY_FOR_DELIVERY]: [client_1.JobCardStatus.DELIVERED],
    [client_1.JobCardStatus.DELIVERED]: [],
    [client_1.JobCardStatus.CANCELLED]: [],
};
function isValidJobCardTransition(from, to) {
    return exports.JOB_CARD_STATUS_TRANSITIONS[from].includes(to);
}
//# sourceMappingURL=job-card-status-transitions.js.map