"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeTechnicianPerformance = computeTechnicianPerformance;
const client_1 = require("@prisma/client");
const TERMINAL_STATUSES = [client_1.JobCardStatus.DELIVERED, client_1.JobCardStatus.CANCELLED];
async function computeTechnicianPerformance(db, technicianId, range) {
    const jobCardDateFilter = range?.from || range?.to
        ? { createdAt: { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) } }
        : {};
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const [jobsOpen, jobsCompleted, hoursAgg, revenueAgg, completedToday, hoursTodayAgg, deliveredJobs] = await Promise.all([
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
        db.jobCard.count({
            where: { technicianId, deletedAt: null, status: client_1.JobCardStatus.DELIVERED, actualDelivery: { gte: todayStart, lt: todayEnd } },
        }),
        db.jobCardLabour.aggregate({
            where: { jobCard: { technicianId, updatedAt: { gte: todayStart, lt: todayEnd } } },
            _sum: { hours: true },
        }),
        db.jobCard.findMany({
            where: { technicianId, deletedAt: null, status: client_1.JobCardStatus.DELIVERED, actualDelivery: { not: null } },
            select: { createdAt: true, actualDelivery: true },
        }),
    ]);
    const completionDays = deliveredJobs
        .filter((jc) => jc.actualDelivery !== null)
        .map((jc) => (jc.actualDelivery.getTime() - jc.createdAt.getTime()) / (24 * 60 * 60 * 1000));
    const avgCompletionDays = completionDays.length > 0 ? completionDays.reduce((a, b) => a + b, 0) / completionDays.length : null;
    return {
        jobsOpen,
        jobsCompleted,
        totalLabourHours: hoursAgg._sum.hours ?? new client_1.Prisma.Decimal(0),
        revenueGenerated: revenueAgg._sum.lineTotal ?? new client_1.Prisma.Decimal(0),
        completedToday,
        hoursToday: hoursTodayAgg._sum.hours ?? new client_1.Prisma.Decimal(0),
        avgCompletionDays,
    };
}
//# sourceMappingURL=technician-performance.js.map