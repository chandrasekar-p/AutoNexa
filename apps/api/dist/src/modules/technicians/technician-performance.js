"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeTechnicianPerformance = computeTechnicianPerformance;
const client_1 = require("@prisma/client");
const TERMINAL_STATUSES = [client_1.JobCardStatus.DELIVERED, client_1.JobCardStatus.CANCELLED];
async function computeTechnicianPerformance(db, technicianId, range) {
    const jobCardDateFilter = range?.from || range?.to
        ? { createdAt: { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) } }
        : {};
    const [jobsOpen, jobsCompleted, hoursAgg, revenueAgg] = await Promise.all([
        db.jobCard.count({
            where: { technicianId, deletedAt: null, status: { notIn: TERMINAL_STATUSES }, ...jobCardDateFilter },
        }),
        db.jobCard.count({
            where: { technicianId, deletedAt: null, status: client_1.JobCardStatus.DELIVERED, ...jobCardDateFilter },
        }),
        db.jobCardLabour.aggregate({
            where: { jobCard: { technicianId, ...jobCardDateFilter } },
            _sum: { hours: true },
        }),
        db.jobCardLabour.aggregate({
            where: { jobCard: { technicianId, invoice: { status: client_1.InvoiceStatus.PAID }, ...jobCardDateFilter } },
            _sum: { lineTotal: true },
        }),
    ]);
    return {
        jobsOpen,
        jobsCompleted,
        totalLabourHours: hoursAgg._sum.hours ?? new client_1.Prisma.Decimal(0),
        revenueGenerated: revenueAgg._sum.lineTotal ?? new client_1.Prisma.Decimal(0),
    };
}
//# sourceMappingURL=technician-performance.js.map