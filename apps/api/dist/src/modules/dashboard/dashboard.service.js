"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const outstanding_1 = require("../../common/billing/outstanding");
const technician_performance_1 = require("../technicians/technician-performance");
const low_stock_1 = require("../parts/low-stock");
const IN_BAY_STATUSES = [
    client_1.JobCardStatus.DIAGNOSIS,
    client_1.JobCardStatus.APPROVED,
    client_1.JobCardStatus.IN_PROGRESS,
    client_1.JobCardStatus.WAITING_PARTS,
    client_1.JobCardStatus.QUALITY_CHECK,
];
const TERMINAL_JOB_CARD_STATUSES = [client_1.JobCardStatus.DELIVERED, client_1.JobCardStatus.CANCELLED];
const OUTSTANDING_STATUSES = [client_1.InvoiceStatus.UNPAID, client_1.InvoiceStatus.PARTIALLY_PAID];
function todayRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}
function monthRange() {
    const now = new Date();
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
}
let DashboardService = class DashboardService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async summary() {
        const db = this.prisma.forTenant();
        const today = todayRange();
        const month = monthRange();
        const [todaysAppointments, vehiclesInService, openJobCards, completedJobsToday, pendingEstimates, unpaidInvoices, todaysSalesAgg, monthlySalesAgg, labourRevenueAgg, partsRevenueAgg, parts, technicians,] = await Promise.all([
            db.appointment.count({
                where: { deletedAt: null, appointmentDate: { gte: today.start, lt: today.end } },
            }),
            db.jobCard.count({ where: { deletedAt: null, status: { in: IN_BAY_STATUSES } } }),
            db.jobCard.count({ where: { deletedAt: null, status: { notIn: TERMINAL_JOB_CARD_STATUSES } } }),
            db.jobCard.count({
                where: {
                    deletedAt: null,
                    status: client_1.JobCardStatus.DELIVERED,
                    actualDelivery: { gte: today.start, lt: today.end },
                },
            }),
            db.estimate.count({ where: { deletedAt: null, status: client_1.EstimateStatus.SENT } }),
            db.invoice.findMany({ where: { status: { in: OUTSTANDING_STATUSES } }, include: { payments: true } }),
            db.invoice.aggregate({
                where: { createdAt: { gte: today.start, lt: today.end } },
                _sum: { grandTotal: true },
            }),
            db.invoice.aggregate({
                where: { createdAt: { gte: month.start, lt: month.end } },
                _sum: { grandTotal: true },
            }),
            db.jobCardLabour.aggregate({
                where: { jobCard: { invoice: { createdAt: { gte: month.start, lt: month.end } } } },
                _sum: { lineTotal: true },
            }),
            db.jobCardPart.aggregate({
                where: { jobCard: { invoice: { createdAt: { gte: month.start, lt: month.end } } } },
                _sum: { lineTotal: true },
            }),
            db.part.findMany({ where: { deletedAt: null, isActive: true } }),
            db.technician.findMany({ include: { user: { select: { name: true } } } }),
        ]);
        const invoicesWithOutstanding = unpaidInvoices.map((inv) => ({
            ...inv,
            outstanding: (0, outstanding_1.computeInvoiceOutstanding)(inv),
        }));
        const pendingPayments = {
            count: invoicesWithOutstanding.length,
            totalOutstanding: (0, outstanding_1.sumOutstanding)(invoicesWithOutstanding),
        };
        const technicianWorkload = await Promise.all(technicians.map(async (t) => {
            const performance = await (0, technician_performance_1.computeTechnicianPerformance)(db, t.id);
            return { technicianId: t.id, name: t.user.name, jobsOpen: performance.jobsOpen };
        }));
        return {
            todaysAppointments,
            vehiclesInService,
            openJobCards,
            completedJobsToday,
            pendingEstimates,
            pendingPayments,
            todaysSales: todaysSalesAgg._sum.grandTotal ?? new client_1.Prisma.Decimal(0),
            monthlySales: monthlySalesAgg._sum.grandTotal ?? new client_1.Prisma.Decimal(0),
            labourRevenueMonthly: labourRevenueAgg._sum.lineTotal ?? new client_1.Prisma.Decimal(0),
            partsRevenueMonthly: partsRevenueAgg._sum.lineTotal ?? new client_1.Prisma.Decimal(0),
            lowStockCount: parts.filter(low_stock_1.isLowStock).length,
            technicianWorkload,
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map