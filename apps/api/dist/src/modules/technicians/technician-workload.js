"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveTechnicianAvailability = deriveTechnicianAvailability;
exports.computeWorkloadPercent = computeWorkloadPercent;
const client_1 = require("@prisma/client");
function deriveTechnicianAvailability(status, jobsOpen) {
    if (status === client_1.TechnicianStatus.ON_LEAVE)
        return 'ON_LEAVE';
    if (status === client_1.TechnicianStatus.INACTIVE)
        return 'INACTIVE';
    return jobsOpen > 0 ? 'ON_JOB' : 'AVAILABLE';
}
function computeWorkloadPercent(jobsOpen, maxConcurrentJobs) {
    if (maxConcurrentJobs <= 0)
        return jobsOpen > 0 ? 100 : 0;
    return Math.max(0, Math.min(100, Math.round((jobsOpen / maxConcurrentJobs) * 100)));
}
//# sourceMappingURL=technician-workload.js.map