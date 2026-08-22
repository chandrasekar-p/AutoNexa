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
exports.dateRangeWhere = dateRangeWhere;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenant_context_1 = require("../../prisma/tenant-context");
const outstanding_1 = require("../../common/billing/outstanding");
const technician_performance_1 = require("../technicians/technician-performance");
const sales_bucketing_1 = require("./sales-bucketing");
const profit_margin_1 = require("./profit-margin");
const loyalty_liability_1 = require("../loyalty/loyalty-liability");
const warranty_status_1 = require("../warranty/warranty-status");
const comeback_rate_1 = require("./comeback-rate");
const gst_summary_1 = require("./gst-summary");
const column_totals_1 = require("./column-totals");
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
    const columnTotals = (0, column_totals_1.computeColumnTotals)(rows);
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize), columnTotals };
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
        const [rows, total, summaryAgg] = await Promise.all([
            db.invoice.findMany({
                where,
                select: {
                    id: true,
                    invoiceNumber: true,
                    status: true,
                    subtotal: true,
                    cgstAmount: true,
                    sgstAmount: true,
                    igstAmount: true,
                    grandTotal: true,
                    createdAt: true,
                    customer: { select: { name: true, mobile: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.invoice.count({ where }),
            db.invoice.aggregate({ where, _sum: { grandTotal: true } }),
        ]);
        const items = rows.map(({ customer, ...row }) => ({
            ...row,
            customerName: customer.name,
            customerMobile: customer.mobile,
        }));
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
        const [rows, total, summaryAgg] = await Promise.all([
            db.payment.findMany({
                where,
                select: {
                    id: true,
                    amount: true,
                    paymentDate: true,
                    method: true,
                    referenceNumber: true,
                    createdAt: true,
                    invoice: { select: { invoiceNumber: true, customer: { select: { name: true } } } },
                },
                orderBy: { paymentDate: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.payment.count({ where }),
            db.payment.aggregate({ where, _sum: { amount: true } }),
        ]);
        const items = rows.map(({ invoice, ...row }) => ({
            ...row,
            invoiceNumber: invoice.invoiceNumber,
            customerName: invoice.customer.name,
        }));
        return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
            summary: { count: total, totalAmount: summaryAgg._sum.amount ?? new client_1.Prisma.Decimal(0) },
            columnTotals: { amount: (summaryAgg._sum.amount ?? new client_1.Prisma.Decimal(0)).toNumber() },
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
        const invoices = await db.invoice.findMany({
            where: dateRangeWhere('createdAt', query.from, query.to),
            select: { subtotal: true, cgstAmount: true, sgstAmount: true, igstAmount: true, grandTotal: true },
        });
        return (0, gst_summary_1.summarizeInvoiceGst)(invoices);
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
    async packagesSummary(query) {
        const db = this.prisma.forTenant();
        const tenantId = tenant_context_1.TenantContext.requireTenantId();
        const [settings, packages] = await Promise.all([
            db.tenantSettings.findUniqueOrThrow({ where: { tenantId } }),
            db.customerServicePackage.findMany({
                include: {
                    servicePackage: { select: { name: true } },
                    customer: { select: { id: true, name: true } },
                    vehicle: { select: { id: true, registrationNo: true } },
                },
                orderBy: { endDate: 'asc' },
            }),
        ]);
        const soonestThresholdDays = Math.max(...settings.reminderThresholdDays);
        const expiringHorizon = new Date(Date.now() + soonestThresholdDays * 24 * 60 * 60 * 1000);
        const now = new Date();
        const counts = {
            active: packages.filter((p) => p.status === 'ACTIVE' && p.endDate > expiringHorizon).length,
            expiringSoon: packages.filter((p) => p.status === 'ACTIVE' && p.endDate <= expiringHorizon && p.endDate > now).length,
            expired: packages.filter((p) => p.status === 'EXPIRED').length,
            cancelled: packages.filter((p) => p.status === 'CANCELLED').length,
        };
        const rows = packages.map((p) => ({
            id: p.id,
            packageName: p.servicePackage.name,
            customerName: p.customer.name,
            vehicleRegistrationNo: p.vehicle.registrationNo,
            status: p.status,
            startDate: p.startDate,
            endDate: p.endDate,
            visitsUsed: p.visitsUsed,
            visitLimit: p.visitLimit,
        }));
        return { counts, ...paginate(rows, query.page ?? 1, query.pageSize ?? 20) };
    }
    async loyaltyLiability() {
        const db = this.prisma.forTenant();
        const tenantId = tenant_context_1.TenantContext.requireTenantId();
        const [settings, customers] = await Promise.all([
            db.tenantSettings.findUniqueOrThrow({ where: { tenantId } }),
            db.customer.findMany({ where: { deletedAt: null, loyaltyPointsBalance: { gt: 0 } }, select: { loyaltyPointsBalance: true } }),
        ]);
        const pointValueRupees = settings.loyaltyPointValueRupees;
        const totalPointsOutstanding = customers.reduce((sum, c) => sum + c.loyaltyPointsBalance, 0);
        return {
            totalPointsOutstanding,
            customersWithBalance: customers.length,
            liabilityRupees: (0, loyalty_liability_1.calculateLoyaltyLiability)(customers.map((c) => c.loyaltyPointsBalance), pointValueRupees),
        };
    }
    async warrantyLiability() {
        const db = this.prisma.forTenant();
        const [labourLines, partLines] = await Promise.all([
            db.jobCardLabour.findMany({
                where: { warrantyMonths: { not: null }, jobCard: { deletedAt: null, actualDelivery: { not: null } } },
                select: { warrantyMonths: true, lineTotal: true, jobCard: { select: { actualDelivery: true } } },
            }),
            db.jobCardPart.findMany({
                where: {
                    OR: [{ warrantyMonths: { not: null } }, { warrantyKm: { not: null } }],
                    jobCard: { deletedAt: null, actualDelivery: { not: null } },
                },
                select: {
                    warrantyMonths: true,
                    warrantyKm: true,
                    quantity: true,
                    part: { select: { purchasePrice: true } },
                    jobCard: { select: { actualDelivery: true, odometer: true, vehicle: { select: { odometerReading: true } } } },
                },
            }),
        ]);
        const activeLabour = labourLines.filter((l) => (0, warranty_status_1.computeWarrantyStatus)(l.jobCard.actualDelivery, l.warrantyMonths, null, null, null).isActive);
        const activeParts = partLines.filter((p) => (0, warranty_status_1.computeWarrantyStatus)(p.jobCard.actualDelivery, p.warrantyMonths, p.warrantyKm, p.jobCard.odometer, p.jobCard.vehicle.odometerReading).isActive);
        const labourExposure = activeLabour.reduce((sum, l) => sum.add(l.lineTotal), new client_1.Prisma.Decimal(0));
        const partsExposure = activeParts.reduce((sum, p) => sum.add(new client_1.Prisma.Decimal(p.part.purchasePrice).mul(p.quantity)), new client_1.Prisma.Decimal(0));
        return {
            labourLinesUnderWarranty: activeLabour.length,
            partsLinesUnderWarranty: activeParts.length,
            labourExposure: labourExposure.toDecimalPlaces(2),
            partsExposure: partsExposure.toDecimalPlaces(2),
            totalExposure: labourExposure.add(partsExposure).toDecimalPlaces(2),
        };
    }
    async warrantyClaimsSummary(query) {
        const db = this.prisma.forTenant();
        const claims = await db.warrantyClaim.findMany({
            include: {
                claimJobCard: { select: { jobCardNumber: true } },
                originalJobCardPart: { select: { part: { select: { name: true } } } },
                originalJobCardLabour: { select: { description: true, labourItem: { select: { description: true } } } },
            },
            orderBy: { createdAt: 'desc' },
        });
        const counts = {
            open: claims.filter((c) => c.status === 'OPEN').length,
            approved: claims.filter((c) => c.status === 'APPROVED').length,
            rejected: claims.filter((c) => c.status === 'REJECTED').length,
            resolved: claims.filter((c) => c.status === 'RESOLVED').length,
        };
        const rows = claims.map((c) => ({
            id: c.id,
            claimJobCardNumber: c.claimJobCard.jobCardNumber,
            originalItem: c.originalJobCardPart?.part.name ?? c.originalJobCardLabour?.labourItem?.description ?? c.originalJobCardLabour?.description ?? 'Unknown',
            status: c.status,
            isBillable: c.isBillable,
            createdAt: c.createdAt,
        }));
        return { counts, ...paginate(rows, query.page ?? 1, query.pageSize ?? 20) };
    }
    async comebackRate(query) {
        const db = this.prisma.forTenant();
        const claims = await db.warrantyClaim.findMany({
            where: dateRangeWhere('createdAt', query.from, query.to),
            include: {
                originalJobCardPart: {
                    select: {
                        partId: true,
                        part: { select: { name: true, supplierId: true, supplier: { select: { name: true } } } },
                        jobCard: { select: { technicianId: true, technician: { select: { user: { select: { name: true } } } } } },
                    },
                },
                originalJobCardLabour: {
                    select: { jobCard: { select: { technicianId: true, technician: { select: { user: { select: { name: true } } } } } } },
                },
            },
        });
        const inputs = claims.map((claim) => {
            const jobCard = claim.originalJobCardPart?.jobCard ?? claim.originalJobCardLabour?.jobCard;
            return {
                technicianId: jobCard?.technicianId ?? null,
                technicianName: jobCard?.technician?.user.name ?? null,
                partId: claim.originalJobCardPart?.partId ?? null,
                partName: claim.originalJobCardPart?.part.name ?? null,
                supplierId: claim.originalJobCardPart?.part.supplierId ?? null,
                supplierName: claim.originalJobCardPart?.part.supplier?.name ?? null,
            };
        });
        return (0, comeback_rate_1.aggregateComebackRate)(inputs, query.groupBy);
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map