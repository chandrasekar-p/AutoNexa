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
exports.SupplierPaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const purchase_invoices_service_1 = require("../purchase-invoices/purchase-invoices.service");
let SupplierPaymentsService = class SupplierPaymentsService {
    constructor(prisma, purchaseInvoicesService) {
        this.prisma = prisma;
        this.purchaseInvoicesService = purchaseInvoicesService;
    }
    async create(dto) {
        await this.assertInvoiceExists(dto.purchaseInvoiceId);
        const payment = await this.prisma.forTenant().supplierPayment.create({
            data: {
                purchaseInvoiceId: dto.purchaseInvoiceId,
                amount: dto.amount,
                paymentDate: new Date(dto.paymentDate),
                method: dto.method,
                referenceNumber: dto.referenceNumber,
            },
        });
        await this.purchaseInvoicesService.recalculateStatus(dto.purchaseInvoiceId);
        return payment;
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const db = this.prisma.forTenant();
        const where = {
            ...(query.purchaseInvoiceId ? { purchaseInvoiceId: query.purchaseInvoiceId } : {}),
        };
        const [items, total] = await Promise.all([
            db.supplierPayment.findMany({
                where,
                orderBy: { paymentDate: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.supplierPayment.count({ where }),
        ]);
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    async findOne(id) {
        const payment = await this.prisma.forTenant().supplierPayment.findFirst({ where: { id } });
        if (!payment)
            throw new common_1.NotFoundException('Supplier payment not found');
        return payment;
    }
    async assertInvoiceExists(purchaseInvoiceId) {
        const invoice = await this.prisma.forTenant().purchaseInvoice.findFirst({
            where: { id: purchaseInvoiceId },
        });
        if (!invoice)
            throw new common_1.NotFoundException('Purchase invoice not found for this payment');
    }
};
exports.SupplierPaymentsService = SupplierPaymentsService;
exports.SupplierPaymentsService = SupplierPaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        purchase_invoices_service_1.PurchaseInvoicesService])
], SupplierPaymentsService);
//# sourceMappingURL=supplier-payments.service.js.map