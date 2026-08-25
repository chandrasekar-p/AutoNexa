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
exports.CustomerServicePackagesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenant_context_1 = require("../../prisma/tenant-context");
const invoices_service_1 = require("../invoices/invoices.service");
const messaging_service_1 = require("../messaging/messaging.service");
const templates_1 = require("../messaging/templates");
const CUSTOMER_PACKAGE_INCLUDE = {
    servicePackage: true,
    customer: { select: { id: true, name: true, mobile: true, email: true, state: true } },
    vehicle: { select: { id: true, registrationNo: true, brand: true, model: true } },
    purchaseInvoice: { select: { id: true, invoiceNumber: true, grandTotal: true, status: true } },
};
let CustomerServicePackagesService = class CustomerServicePackagesService {
    constructor(prisma, invoicesService, messaging) {
        this.prisma = prisma;
        this.invoicesService = invoicesService;
        this.messaging = messaging;
    }
    async sell(dto) {
        const tenantId = tenant_context_1.TenantContext.requireTenantId();
        const db = this.prisma.forTenant();
        const [servicePackage, customer, vehicle, tenantSettings] = await Promise.all([
            db.servicePackage.findFirst({ where: { id: dto.servicePackageId, deletedAt: null, isActive: true } }),
            db.customer.findFirstOrThrow({ where: { id: dto.customerId, deletedAt: null } }),
            db.vehicle.findFirstOrThrow({ where: { id: dto.vehicleId, deletedAt: null } }),
            db.tenantSettings.findUniqueOrThrow({ where: { tenantId } }),
        ]);
        if (!servicePackage)
            throw new common_1.NotFoundException('Service package not found or no longer offered');
        if (vehicle.customerId !== customer.id)
            throw new common_1.BadRequestException('This vehicle does not belong to this customer');
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + servicePackage.validityMonths);
        const result = await db.$transaction(async (tx) => {
            const invoice = await this.invoicesService.createInvoiceInTransaction(tx, {
                tenantId,
                tenantSettings,
                customerId: customer.id,
                customerState: customer.state,
                jobCardId: null,
                lineItemInputs: [
                    {
                        description: servicePackage.name,
                        quantity: new client_1.Prisma.Decimal(1),
                        unitPrice: servicePackage.price,
                        gstRate: servicePackage.gstRate,
                        hsnSac: null,
                        lineTotal: servicePackage.price,
                    },
                ],
            });
            const customerPackage = await tx.customerServicePackage.create({
                data: {
                    servicePackageId: servicePackage.id,
                    customerId: customer.id,
                    vehicleId: vehicle.id,
                    purchaseInvoiceId: invoice.id,
                    startDate,
                    endDate,
                    visitLimit: servicePackage.visitLimit,
                    status: client_1.CustomerPackageStatus.ACTIVE,
                },
            });
            return { invoice, customerPackage };
        });
        await this.invoicesService.sendInvoiceIssued(tenantId, customer, result.invoice.id, result.invoice.invoiceNumber, result.invoice.grandTotal);
        return this.findOne(result.customerPackage.id);
    }
    async renew(id) {
        const existing = await this.findOne(id);
        if (existing.status === client_1.CustomerPackageStatus.CANCELLED) {
            throw new common_1.BadRequestException('This package was cancelled — sell a new package instead of renewing it');
        }
        const sold = await this.sell({ servicePackageId: existing.servicePackageId, customerId: existing.customerId, vehicleId: existing.vehicleId });
        await this.prisma.forTenant().customerServicePackage.update({ where: { id: sold.id }, data: { renewedFromId: existing.id } });
        return this.findOne(sold.id);
    }
    async cancel(id) {
        const existing = await this.findOne(id);
        if (existing.status !== client_1.CustomerPackageStatus.ACTIVE) {
            throw new common_1.BadRequestException(`Cannot cancel a package that is already ${existing.status}`);
        }
        const cancelled = await this.prisma.forTenant().customerServicePackage.update({
            where: { id },
            data: { status: client_1.CustomerPackageStatus.CANCELLED },
        });
        await this.sendCancelledNotification(existing);
        return cancelled;
    }
    async sendCancelledNotification(pkg) {
        const tenantId = tenant_context_1.TenantContext.requireTenantId();
        const tenant = await this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
        const content = (0, templates_1.packageCancelledMessage)({
            workshopName: tenant?.name ?? 'AutoNexa',
            customerName: pkg.customer.name,
            packageName: pkg.servicePackage.name,
        });
        await this.messaging.notifyCustomer(tenantId, 'service-package.cancelled', { email: pkg.customer.email, mobile: pkg.customer.mobile, customerId: pkg.customer.id }, content, { type: 'CustomerServicePackage', id: pkg.id });
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const db = this.prisma.forTenant();
        const where = {
            ...(query.customerId ? { customerId: query.customerId } : {}),
            ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
            ...(query.status ? { status: query.status } : {}),
        };
        const [items, total] = await Promise.all([
            db.customerServicePackage.findMany({
                where,
                include: CUSTOMER_PACKAGE_INCLUDE,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.customerServicePackage.count({ where }),
        ]);
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    async findOne(id) {
        const pkg = await this.prisma.forTenant().customerServicePackage.findFirst({ where: { id }, include: CUSTOMER_PACKAGE_INCLUDE });
        if (!pkg)
            throw new common_1.NotFoundException('Customer service package not found');
        return pkg;
    }
};
exports.CustomerServicePackagesService = CustomerServicePackagesService;
exports.CustomerServicePackagesService = CustomerServicePackagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        invoices_service_1.InvoicesService,
        messaging_service_1.MessagingService])
], CustomerServicePackagesService);
//# sourceMappingURL=customer-service-packages.service.js.map