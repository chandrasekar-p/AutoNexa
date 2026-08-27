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
exports.SuppliersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const purchase_outstanding_1 = require("../../common/billing/purchase-outstanding");
let SuppliersService = class SuppliersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    create(dto) {
        return this.prisma.forTenant().supplier.create({
            data: { ...dto, isActive: dto.isActive ?? true },
        });
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const db = this.prisma.forTenant();
        const where = {
            deletedAt: null,
            ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
            ...(query.paymentTerms ? { paymentTerms: query.paymentTerms } : {}),
            ...(query.from || query.to
                ? {
                    createdAt: {
                        ...(query.from ? { gte: new Date(query.from) } : {}),
                        ...(query.to ? { lte: new Date(query.to) } : {}),
                    },
                }
                : {}),
            ...(query.search
                ? {
                    OR: [
                        { name: { contains: query.search, mode: 'insensitive' } },
                        { contactPerson: { contains: query.search, mode: 'insensitive' } },
                        { mobile: { contains: query.search } },
                        { email: { contains: query.search, mode: 'insensitive' } },
                        { gstin: { contains: query.search, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const [items, total] = await Promise.all([
            db.supplier.findMany({
                where,
                orderBy: { name: 'asc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.supplier.count({ where }),
        ]);
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    async summary() {
        const db = this.prisma.forTenant();
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const [total, active, inactive, poItemsThisMonth, suppliers] = await Promise.all([
            db.supplier.count({ where: { deletedAt: null } }),
            db.supplier.count({ where: { deletedAt: null, isActive: true } }),
            db.supplier.count({ where: { deletedAt: null, isActive: false } }),
            db.purchaseOrderItem.findMany({
                where: { purchaseOrder: { createdAt: { gte: monthStart, lt: monthEnd }, status: { not: client_1.PurchaseOrderStatus.CANCELLED } } },
                select: { lineTotal: true },
            }),
            db.supplier.findMany({ where: { deletedAt: null }, select: { paymentTerms: true } }),
        ]);
        const totalPurchasesThisMonth = poItemsThisMonth
            .reduce((sum, i) => sum.add(i.lineTotal), new client_1.Prisma.Decimal(0))
            .toDecimalPlaces(2);
        const paymentTermsOptions = Array.from(new Set(suppliers.map((s) => s.paymentTerms).filter((t) => Boolean(t)))).sort();
        return { total, active, inactive, totalPurchasesThisMonth: totalPurchasesThisMonth.toString(), paymentTermsOptions };
    }
    async findOne(id) {
        const supplier = await this.prisma.forTenant().supplier.findFirst({ where: { id, deletedAt: null } });
        if (!supplier)
            throw new common_1.NotFoundException('Supplier not found');
        const db = this.prisma.forTenant();
        const [totalPurchaseOrders, poItems, partsSuppliedCount, lastPurchaseOrder, unpaidPurchaseInvoices] = await Promise.all([
            db.purchaseOrder.count({ where: { supplierId: id } }),
            db.purchaseOrderItem.findMany({
                where: { purchaseOrder: { supplierId: id, status: { not: client_1.PurchaseOrderStatus.CANCELLED } } },
                select: { lineTotal: true },
            }),
            db.part.count({ where: { supplierId: id, deletedAt: null } }),
            db.purchaseOrder.findFirst({ where: { supplierId: id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
            db.purchaseInvoice.findMany({
                where: {
                    purchaseOrder: { supplierId: id },
                    status: { in: [client_1.PurchaseInvoiceStatus.UNPAID, client_1.PurchaseInvoiceStatus.PARTIALLY_PAID] },
                },
                select: { status: true, total: true, payments: { select: { amount: true } } },
            }),
        ]);
        const totalPurchaseValue = poItems.reduce((sum, i) => sum.add(i.lineTotal), new client_1.Prisma.Decimal(0)).toDecimalPlaces(2);
        const invoicesWithOutstanding = unpaidPurchaseInvoices.map((inv) => ({
            ...inv,
            outstanding: (0, purchase_outstanding_1.computePurchaseInvoiceOutstanding)(inv),
        }));
        const outstandingPayable = (0, purchase_outstanding_1.sumPurchaseOutstanding)(invoicesWithOutstanding);
        return {
            ...supplier,
            stats: {
                totalPurchaseOrders,
                totalPurchaseValue: totalPurchaseValue.toString(),
                outstandingPayable: outstandingPayable.toString(),
                partsSuppliedCount,
                lastPurchaseDate: lastPurchaseOrder?.createdAt ?? null,
            },
        };
    }
    async update(id, dto) {
        await this.assertExists(id);
        return this.prisma.forTenant().supplier.update({ where: { id }, data: dto });
    }
    async remove(id) {
        await this.assertExists(id);
        const db = this.prisma.forTenant();
        const [purchaseOrderCount, partsCount] = await Promise.all([
            db.purchaseOrder.count({ where: { supplierId: id } }),
            db.part.count({ where: { supplierId: id, deletedAt: null } }),
        ]);
        if (purchaseOrderCount > 0 || partsCount > 0) {
            throw new common_1.ConflictException('This supplier has purchase orders or parts on file — deactivate it instead of deleting.');
        }
        return this.prisma.forTenant().supplier.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
    async assertExists(id) {
        const supplier = await this.prisma.forTenant().supplier.findFirst({ where: { id, deletedAt: null } });
        if (!supplier)
            throw new common_1.NotFoundException('Supplier not found');
        return supplier;
    }
};
exports.SuppliersService = SuppliersService;
exports.SuppliersService = SuppliersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SuppliersService);
//# sourceMappingURL=suppliers.service.js.map