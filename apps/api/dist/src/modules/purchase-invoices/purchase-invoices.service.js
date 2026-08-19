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
exports.PurchaseInvoicesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const rollup_payment_status_1 = require("../../common/billing/rollup-payment-status");
const PURCHASE_INVOICE_STATUSES = {
    unpaid: client_1.PurchaseInvoiceStatus.UNPAID,
    partiallyPaid: client_1.PurchaseInvoiceStatus.PARTIALLY_PAID,
    paid: client_1.PurchaseInvoiceStatus.PAID,
};
let PurchaseInvoicesService = class PurchaseInvoicesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        await this.assertPurchaseOrderExists(dto.purchaseOrderId);
        return this.prisma.forTenant().purchaseInvoice.create({
            data: {
                purchaseOrderId: dto.purchaseOrderId,
                supplierInvoiceNumber: dto.supplierInvoiceNumber,
                invoiceDate: new Date(dto.invoiceDate),
                subtotal: dto.subtotal,
                taxAmount: dto.taxAmount,
                total: dto.total,
                status: client_1.PurchaseInvoiceStatus.UNPAID,
            },
        });
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const db = this.prisma.forTenant();
        const where = {
            ...(query.purchaseOrderId ? { purchaseOrderId: query.purchaseOrderId } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.search
                ? { supplierInvoiceNumber: { contains: query.search, mode: 'insensitive' } }
                : {}),
        };
        const [items, total] = await Promise.all([
            db.purchaseInvoice.findMany({
                where,
                orderBy: { invoiceDate: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.purchaseInvoice.count({ where }),
        ]);
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    async findOne(id) {
        const invoice = await this.prisma.forTenant().purchaseInvoice.findFirst({
            where: { id },
            include: { payments: { orderBy: { paymentDate: 'desc' } } },
        });
        if (!invoice)
            throw new common_1.NotFoundException('Purchase invoice not found');
        return invoice;
    }
    async update(id, dto) {
        await this.assertExists(id);
        await this.prisma.forTenant().purchaseInvoice.update({
            where: { id },
            data: {
                ...dto,
                ...(dto.invoiceDate ? { invoiceDate: new Date(dto.invoiceDate) } : {}),
            },
        });
        return this.recalculateStatus(id);
    }
    async recalculateStatus(id) {
        const db = this.prisma.forTenant();
        const [invoice, payments] = await Promise.all([
            db.purchaseInvoice.findFirstOrThrow({ where: { id } }),
            db.supplierPayment.findMany({ where: { purchaseInvoiceId: id } }),
        ]);
        const totalPaid = payments.reduce((sum, p) => sum.add(p.amount), new client_1.Prisma.Decimal(0));
        const status = (0, rollup_payment_status_1.rollupPaymentStatus)(totalPaid, invoice.total, PURCHASE_INVOICE_STATUSES);
        return db.purchaseInvoice.update({
            where: { id },
            data: { status },
            include: { payments: { orderBy: { paymentDate: 'desc' } } },
        });
    }
    async assertExists(id) {
        const invoice = await this.prisma.forTenant().purchaseInvoice.findFirst({ where: { id } });
        if (!invoice)
            throw new common_1.NotFoundException('Purchase invoice not found');
        return invoice;
    }
    async assertPurchaseOrderExists(purchaseOrderId) {
        const po = await this.prisma.forTenant().purchaseOrder.findFirst({ where: { id: purchaseOrderId } });
        if (!po)
            throw new common_1.NotFoundException('Purchase order not found for this invoice');
    }
};
exports.PurchaseInvoicesService = PurchaseInvoicesService;
exports.PurchaseInvoicesService = PurchaseInvoicesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PurchaseInvoicesService);
//# sourceMappingURL=purchase-invoices.service.js.map