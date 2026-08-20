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
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const outstanding_1 = require("../../common/billing/outstanding");
const technician_performance_1 = require("../technicians/technician-performance");
const sales_bucketing_1 = require("./sales-bucketing");
const profit_margin_1 = require("./profit-margin");
function dateRangeWhere(field, from, to) {
    if (!from && !to)
        return {};
    return {
        [field]: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
        },
    };
}
function paginate(rows, page, pageSize) {
    const total = rows.length;
    const items = rows.slice((page - 1) * pageSize, page * pageSize);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
let ReportsService = class ReportsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async sales(query) {
        const db = this.prisma.forTenant();
        const groupBy = query.groupBy ?? 'day';
        const invoices = await db.invoice.findMany({
            where: dateRangeWhere('createdAt', query.from, query.to),
            select: { createdAt: true, grandTotal: true },
        });
        const buckets = (0, sales_bucketing_1.bucketSales)(invoices.map((i) => ({ date: i.createdAt, amount: i.grandTotal })), groupBy);
        return paginate(buckets, query.page ?? 1, query.pageSize ?? 20);
    }
    async invoices(query) {
        const db = this.prisma.forTenant();
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const where = {
            ...dateRangeWhere('createdAt', query.from, query.to),
            ...(query.status ? { status: query.status } : {}),
        };
        const [items, total, summaryAgg] = await Promise.all([
            db.invoice.findMany({
                where,
                include: { customer: { select: { id: true, name: true, mobile: true } } },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.invoice.count({ where }),
            db.invoice.aggregate({ where, _sum: { grandTotal: true } }),
        ]);
        return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
            summary: { count: total, totalGrandTotal: summaryAgg._sum.grandTotal ?? new client_1.Prisma.Decimal(0) },
        };
    }
    async payments(query) {
        const db = this.prisma.forTenant();
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const where = {
            ...dateRangeWhere('paymentDate', query.from, query.to),
            ...(query.method ? { method: query.method } : {}),
        };
        const [items, total, summaryAgg] = await Promise.all([
            db.payment.findMany({
                where,
                include: { invoice: { select: { id: true, invoiceNumber: true, customerId: true } } },
                orderBy: { paymentDate: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.payment.count({ where }),
            db.payment.aggregate({ where, _sum: { amount: true } }),
        ]);
        return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
            summary: { count: total, totalAmount: summaryAgg._sum.amount ?? new client_1.Prisma.Decimal(0) },
        };
    }
    async outstanding(query) {
        const db = this.prisma.forTenant();
        const customers = await db.customer.findMany({
            where: { deletedAt: null },
            include: { invoices: { include: { payments: true } } },
        });
        const rows = customers
            .map((c) => {
            const invoicesWithOutstanding = c.invoices.map((inv) => ({
                ...inv,
                outstanding: (0, outstanding_1.computeInvoiceOutstanding)(inv),
            }));
            return {
                customerId: c.id,
                customerName: c.name,
                mobile: c.mobile,
                totalOutstanding: (0, outstanding_1.sumOutstanding)(invoicesWithOutstanding),
            };
        })
            .filter((r) => r.totalOutstanding.gt(0))
            .sort((a, b) => b.totalOutstanding.toNumber() - a.totalOutstanding.toNumber());
        return paginate(rows, query.page ?? 1, query.pageSize ?? 20);
    }
    async partsSales(query) {
        const db = this.prisma.forTenant();
        const grouped = await db.jobCardPart.groupBy({
            by: ['partId'],
            where: { jobCard: { invoice: dateRangeWhere('createdAt', query.from, query.to) } },
            _sum: { lineTotal: true, quantity: true },
        });
        const partIds = grouped.map((g) => g.partId);
        const parts = partIds.length
            ? await db.part.findMany({ where: { id: { in: partIds } }, select: { id: true, partNumber: true, name: true } })
            : [];
        const partsById = new Map(parts.map((p) => [p.id, p]));
        const rows = grouped
            .map((g) => ({
            partId: g.partId,
            partNumber: partsById.get(g.partId)?.partNumber,
            partName: partsById.get(g.partId)?.name,
            quantitySold: g._sum.quantity ?? 0,
            totalSales: (g._sum.lineTotal ?? new client_1.Prisma.Decimal(0)).toDecimalPlaces(2),
        }))
            .sort((a, b) => b.totalSales.toNumber() - a.totalSales.toNumber());
        return paginate(rows, query.page ?? 1, query.pageSize ?? 20);
    }
    async inventoryValuation(query) {
        const db = this.prisma.forTenant();
        const parts = await db.part.findMany({ where: { deletedAt: null } });
        const rows = parts.map((p) => ({
            partId: p.id,
            partNumber: p.partNumber,
            name: p.name,
            currentStock: p.currentStock,
            purchasePrice: p.purchasePrice,
            valuation: new client_1.Prisma.Decimal(p.currentStock).mul(p.purchasePrice).toDecimalPlaces(2),
        }));
        const grandTotal = rows.reduce((sum, r) => sum.add(r.valuation), new client_1.Prisma.Decimal(0)).toDecimalPlaces(2);
        return { ...paginate(rows, query.page ?? 1, query.pageSize ?? 20), grandTotal };
    }
    async purchases(query) {
        const db = this.prisma.forTenant();
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const where = {
            ...dateRangeWhere('createdAt', query.from, query.to),
            ...(query.supplierId ? { supplierId: query.supplierId } : {}),
        };
        const [purchaseOrders, total] = await Promise.all([
            db.purchaseOrder.findMany({
                where,
                include: {
                    supplier: { select: { id: true, name: true } },
                    items: true,
                    purchaseInvoices: true,
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.purchaseOrder.count({ where }),
        ]);
        const items = purchaseOrders.map((po) => ({
            id: po.id,
            poNumber: po.poNumber,
            supplier: po.supplier,
            status: po.status,
            createdAt: po.createdAt,
            orderValue: po.items.reduce((sum, i) => sum.add(i.lineTotal), new client_1.Prisma.Decimal(0)).toDecimalPlaces(2),
            invoicedValue: po.purchaseInvoices
                .reduce((sum, i) => sum.add(i.total), new client_1.Prisma.Decimal(0))
                .toDecimalPlaces(2),
        }));
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    async supplierOutstanding(query) {
        const db = this.prisma.forTenant();
        const unpaidInvoices = await db.purchaseInvoice.findMany({
            where: { status: { in: [client_1.PurchaseInvoiceStatus.UNPAID, client_1.PurchaseInvoiceStatus.PARTIALLY_PAID] } },
            include: {
                purchaseOrder: { include: { supplier: { select: { id: true, name: true } } } },
                payments: true,
            },
        });
        const bySupplier = new Map();
        for (const inv of unpaidInvoices) {
            const paid = inv.payments.reduce((sum, p) => sum.add(p.amount), new client_1.Prisma.Decimal(0));
            const outstanding = new client_1.Prisma.Decimal(inv.total).sub(paid);
            const supplier = inv.purchaseOrder.supplier;
            const existing = bySupplier.get(supplier.id);
            if (existing) {
                existing.outstanding = existing.outstanding.add(outstanding);
            }
            else {
                bySupplier.set(supplier.id, { supplierId: supplier.id, supplierName: supplier.name, outstanding });
            }
        }
        const rows = [...bySupplier.values()]
            .map((r) => ({ ...r, outstanding: r.outstanding.toDecimalPlaces(2) }))
            .sort((a, b) => b.outstanding.toNumber() - a.outstanding.toNumber());
        return paginate(rows, query.page ?? 1, query.pageSize ?? 20);
    }
    async labourRevenue(query) {
        const db = this.prisma.forTenant();
        const where = { jobCard: { invoice: dateRangeWhere('createdAt', query.from, query.to) } };
        if (!query.groupByTechnician) {
            const agg = await db.jobCardLabour.aggregate({ where, _sum: { lineTotal: true, hours: true } });
            return {
                totalRevenue: (agg._sum.lineTotal ?? new client_1.Prisma.Decimal(0)).toDecimalPlaces(2),
                totalHours: agg._sum.hours ?? new client_1.Prisma.Decimal(0),
            };
        }
        const labourLines = await db.jobCardLabour.findMany({
            where,
            select: { lineTotal: true, hours: true, jobCard: { select: { technicianId: true } } },
        });
        const byTechnician = new Map();
        for (const line of labourLines) {
            const key = line.jobCard.technicianId ?? 'unassigned';
            const existing = byTechnician.get(key) ??
                { technicianId: line.jobCard.technicianId, revenue: new client_1.Prisma.Decimal(0), hours: new client_1.Prisma.Decimal(0) };
            byTechnician.set(key, {
                technicianId: existing.technicianId,
                revenue: existing.revenue.add(line.lineTotal),
                hours: existing.hours.add(line.hours),
            });
        }
        const technicianIds = [...byTechnician.values()]
            .map((v) => v.technicianId)
            .filter((id) => !!id);
        const technicians = technicianIds.length
            ? await db.technician.findMany({
                where: { id: { in: technicianIds } },
                include: { user: { select: { name: true } } },
            })
            : [];
        const techById = new Map(technicians.map((t) => [t.id, t]));
        const rows = [...byTechnician.values()]
            .map((v) => ({
            technicianId: v.technicianId,
            technicianName: v.technicianId ? (techById.get(v.technicianId)?.user.name ?? 'Unknown') : 'Unassigned',
            revenue: v.revenue.toDecimalPlaces(2),
            hours: v.hours.toDecimalPlaces(2),
        }))
            .sort((a, b) => b.revenue.toNumber() - a.revenue.toNumber());
        return paginate(rows, query.page ?? 1, query.pageSize ?? 20);
    }
    async technicianPerformance(query) {
        const db = this.prisma.forTenant();
        const range = {
            from: query.from ? new Date(query.from) : undefined,
            to: query.to ? new Date(query.to) : undefined,
        };
        const technicians = await db.technician.findMany({ include: { user: { select: { id: true, name: true } } } });
        const rows = await Promise.all(technicians.map(async (t) => {
            const performance = await (0, technician_performance_1.computeTechnicianPerformance)(db, t.id, range);
            return { technicianId: t.id, name: t.user.name, employeeId: t.employeeId, ...performance };
        }));
        rows.sort((a, b) => b.revenueGenerated.toNumber() - a.revenueGenerated.toNumber());
        return paginate(rows, query.page ?? 1, query.pageSize ?? 20);
    }
    async customerRevenue(query) {
        const db = this.prisma.forTenant();
        const grouped = await db.invoice.groupBy({
            by: ['customerId'],
            where: dateRangeWhere('createdAt', query.from, query.to),
            _sum: { grandTotal: true },
        });
        const customerIds = grouped.map((g) => g.customerId);
        const customers = customerIds.length
            ? await db.customer.findMany({
                where: { id: { in: customerIds } },
                select: { id: true, name: true, mobile: true },
            })
            : [];
        const custById = new Map(customers.map((c) => [c.id, c]));
        const rows = grouped
            .map((g) => ({
            customerId: g.customerId,
            customer: custById.get(g.customerId),
            totalRevenue: (g._sum.grandTotal ?? new client_1.Prisma.Decimal(0)).toDecimalPlaces(2),
        }))
            .sort((a, b) => b.totalRevenue.toNumber() - a.totalRevenue.toNumber());
        return paginate(rows, query.page ?? 1, query.pageSize ?? 20);
    }
    async profitMargin(query) {
        const db = this.prisma.forTenant();
        const invoiceDateFilter = dateRangeWhere('createdAt', query.from, query.to);
        const [partLines, labourAgg] = await Promise.all([
            db.jobCardPart.findMany({
                where: { jobCard: { invoice: invoiceDateFilter } },
                include: { part: { select: { purchasePrice: true } } },
            }),
            db.jobCardLabour.aggregate({
                where: { jobCard: { invoice: invoiceDateFilter } },
                _sum: { lineTotal: true },
            }),
        ]);
        const partsMargin = partLines
            .reduce((sum, line) => sum.add((0, profit_margin_1.calculatePartMargin)({
            quantity: line.quantity,
            sellingPrice: line.unitPrice,
            purchasePrice: line.part.purchasePrice,
        })), new client_1.Prisma.Decimal(0))
            .toDecimalPlaces(2);
        const labourRevenue = (labourAgg._sum.lineTotal ?? new client_1.Prisma.Decimal(0)).toDecimalPlaces(2);
        return {
            partsMargin,
            labourRevenue,
            totalMargin: (0, profit_margin_1.calculateTotalMargin)(partsMargin, labourRevenue),
            note: 'Approximate, not a true profit figure: labour is counted at 100% margin (no per-technician cost data exists to net against it), and parts margin uses each part\'s current purchase price rather than a historical cost snapshot. Excludes rent, salaries, and other overhead.',
        };
    }
    async gstSummary(query) {
        const db = this.prisma.forTenant();
        const agg = await db.invoice.aggregate({
            where: dateRangeWhere('createdAt', query.from, query.to),
            _sum: { subtotal: true, cgstAmount: true, sgstAmount: true, igstAmount: true, grandTotal: true },
            _count: { _all: true },
        });
        const cgst = agg._sum.cgstAmount ?? new client_1.Prisma.Decimal(0);
        const sgst = agg._sum.sgstAmount ?? new client_1.Prisma.Decimal(0);
        const igst = agg._sum.igstAmount ?? new client_1.Prisma.Decimal(0);
        return {
            invoiceCount: agg._count._all,
            subtotal: agg._sum.subtotal ?? new client_1.Prisma.Decimal(0),
            cgstAmount: cgst,
            sgstAmount: sgst,
            igstAmount: igst,
            totalGst: cgst.add(sgst).add(igst).toDecimalPlaces(2),
            grandTotal: agg._sum.grandTotal ?? new client_1.Prisma.Decimal(0),
        };
    }
    async jobCardStatus(query) {
        const db = this.prisma.forTenant();
        const grouped = await db.jobCard.groupBy({
            by: ['status'],
            where: { deletedAt: null, ...dateRangeWhere('createdAt', query.from, query.to) },
            _count: { _all: true },
        });
        return grouped
            .map((g) => ({ status: g.status, count: g._count._all }))
            .sort((a, b) => b.count - a.count);
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map