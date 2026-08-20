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
exports.EstimatesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenant_context_1 = require("../../prisma/tenant-context");
const job_cards_service_1 = require("../job-cards/job-cards.service");
const messaging_service_1 = require("../messaging/messaging.service");
const templates_1 = require("../messaging/templates");
const estimate_totals_1 = require("./estimate-totals");
const CUSTOMER_SUMMARY_SELECT = { id: true, name: true, mobile: true, email: true };
const VEHICLE_SUMMARY_SELECT = { id: true, registrationNo: true, brand: true, model: true };
let EstimatesService = class EstimatesService {
    constructor(prisma, jobCardsService, messaging) {
        this.prisma = prisma;
        this.jobCardsService = jobCardsService;
        this.messaging = messaging;
    }
    async create(dto) {
        await this.assertCustomerExists(dto.customerId);
        await this.assertVehicleExists(dto.vehicleId);
        const db = this.prisma.forTenant();
        const estimate = await db.estimate.create({
            data: {
                customerId: dto.customerId,
                vehicleId: dto.vehicleId,
                jobDescription: dto.jobDescription,
                discountAmount: dto.discountAmount ?? 0,
            },
        });
        if (dto.lineItems?.length) {
            await db.estimateLineItem.createMany({
                data: dto.lineItems.map((item) => this.toLineItemRow(estimate.id, item)),
            });
            return this.recalculate(estimate.id);
        }
        return this.findOne(estimate.id);
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const db = this.prisma.forTenant();
        const where = {
            deletedAt: null,
            ...(query.customerId ? { customerId: query.customerId } : {}),
            ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.search
                ? { jobDescription: { contains: query.search, mode: 'insensitive' } }
                : {}),
        };
        const [items, total] = await Promise.all([
            db.estimate.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.estimate.count({ where }),
        ]);
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    async findOne(id) {
        const estimate = await this.prisma.forTenant().estimate.findFirst({
            where: { id, deletedAt: null },
            include: { lineItems: true },
        });
        if (!estimate)
            throw new common_1.NotFoundException('Estimate not found');
        return estimate;
    }
    async update(id, dto) {
        await this.assertExists(id);
        await this.prisma.forTenant().estimate.update({ where: { id }, data: dto });
        return this.recalculate(id);
    }
    async remove(id) {
        await this.assertExists(id);
        return this.prisma.forTenant().estimate.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
    async addLineItem(estimateId, dto) {
        await this.assertExists(estimateId);
        await this.prisma.forTenant().estimateLineItem.create({
            data: this.toLineItemRow(estimateId, dto),
        });
        return this.recalculate(estimateId);
    }
    async updateLineItem(estimateId, itemId, dto) {
        const existing = await this.assertLineItemExists(estimateId, itemId);
        const quantity = dto.quantity ?? existing.quantity;
        const unitPrice = dto.unitPrice ?? existing.unitPrice;
        const gstRate = dto.gstRate ?? existing.gstRate;
        await this.prisma.forTenant().estimateLineItem.update({
            where: { id: itemId },
            data: {
                itemType: dto.itemType ?? existing.itemType,
                description: dto.description ?? existing.description,
                quantity,
                unitPrice,
                gstRate,
                lineTotal: (0, estimate_totals_1.calculateLineTotal)(quantity, unitPrice),
            },
        });
        return this.recalculate(estimateId);
    }
    async removeLineItem(estimateId, itemId) {
        await this.assertLineItemExists(estimateId, itemId);
        await this.prisma.forTenant().estimateLineItem.delete({ where: { id: itemId } });
        return this.recalculate(estimateId);
    }
    async send(id) {
        const estimate = await this.transition(id, client_1.EstimateStatus.DRAFT, client_1.EstimateStatus.SENT, {});
        const tenantId = tenant_context_1.TenantContext.requireTenantId();
        const tenant = await this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
        const content = (0, templates_1.estimateReadyMessage)({
            workshopName: tenant?.name ?? 'AutoNexa',
            customerName: estimate.customer.name,
            vehicleLabel: `${estimate.vehicle.registrationNo} ${estimate.vehicle.brand} ${estimate.vehicle.model}`,
            estimateNumber: `EST-${id.slice(0, 8).toUpperCase()}`,
            grandTotal: `₹${Number(estimate.total).toFixed(2)}`,
        });
        await this.messaging.notifyCustomer(tenantId, 'estimate.ready', { email: estimate.customer.email, mobile: estimate.customer.mobile }, content, { type: 'Estimate', id });
        await this.messaging.notifyOps(tenantId, 'estimate.ready', `Estimate sent: ${estimate.customer.name} — ${estimate.vehicle.registrationNo} — ₹${Number(estimate.total).toFixed(2)}`, { type: 'Estimate', id });
        return estimate;
    }
    async approve(id) {
        const estimate = await this.transition(id, client_1.EstimateStatus.SENT, client_1.EstimateStatus.APPROVED, {
            approvedAt: new Date(),
        });
        await this.prisma.forTenant().notification.create({
            data: {
                userId: null,
                type: 'estimate_approved',
                title: 'Estimate approved',
                message: `Estimate for ${estimate.jobDescription ?? 'a vehicle'} has been approved.`,
                relatedEntityType: 'Estimate',
                relatedEntityId: id,
            },
        });
        return estimate;
    }
    async reject(id) {
        return this.transition(id, client_1.EstimateStatus.SENT, client_1.EstimateStatus.REJECTED, { rejectedAt: new Date() });
    }
    async convertToJobCard(id) {
        const estimate = await this.assertExists(id);
        if (estimate.status !== client_1.EstimateStatus.APPROVED) {
            throw new common_1.BadRequestException('Estimate must be in APPROVED status to convert to a job card');
        }
        const full = await this.findOne(id);
        const jobCard = await this.jobCardsService.createFromEstimate(full);
        await this.prisma.forTenant().estimate.update({
            where: { id },
            data: { status: client_1.EstimateStatus.CONVERTED },
        });
        return jobCard;
    }
    async transition(id, fromStatus, toStatus, extra) {
        const estimate = await this.assertExists(id);
        if (estimate.status !== fromStatus) {
            throw new common_1.BadRequestException(`Estimate must be in ${fromStatus} status to transition to ${toStatus}`);
        }
        return this.prisma.forTenant().estimate.update({
            where: { id },
            data: { status: toStatus, ...extra },
            include: {
                lineItems: true,
                customer: { select: CUSTOMER_SUMMARY_SELECT },
                vehicle: { select: VEHICLE_SUMMARY_SELECT },
            },
        });
    }
    toLineItemRow(estimateId, dto) {
        const quantity = dto.quantity ?? 1;
        const gstRate = dto.gstRate ?? 18;
        return {
            estimateId,
            itemType: dto.itemType,
            description: dto.description,
            quantity,
            unitPrice: dto.unitPrice,
            gstRate,
            lineTotal: (0, estimate_totals_1.calculateLineTotal)(quantity, dto.unitPrice),
        };
    }
    async recalculate(estimateId) {
        const db = this.prisma.forTenant();
        const [lineItems, estimate] = await Promise.all([
            db.estimateLineItem.findMany({ where: { estimateId } }),
            db.estimate.findFirstOrThrow({ where: { id: estimateId } }),
        ]);
        const { subtotal, taxAmount, total } = (0, estimate_totals_1.calculateEstimateTotals)(lineItems, estimate.discountAmount);
        return db.estimate.update({
            where: { id: estimateId },
            data: { subtotal, taxAmount, total },
            include: { lineItems: true },
        });
    }
    async assertExists(id) {
        const estimate = await this.prisma.forTenant().estimate.findFirst({ where: { id, deletedAt: null } });
        if (!estimate)
            throw new common_1.NotFoundException('Estimate not found');
        return estimate;
    }
    async assertLineItemExists(estimateId, itemId) {
        const item = await this.prisma.forTenant().estimateLineItem.findFirst({ where: { id: itemId, estimateId } });
        if (!item)
            throw new common_1.NotFoundException('Estimate line item not found');
        return item;
    }
    async assertCustomerExists(customerId) {
        const customer = await this.prisma.forTenant().customer.findFirst({
            where: { id: customerId, deletedAt: null },
        });
        if (!customer)
            throw new common_1.NotFoundException('Customer not found for this estimate');
    }
    async assertVehicleExists(vehicleId) {
        const vehicle = await this.prisma.forTenant().vehicle.findFirst({
            where: { id: vehicleId, deletedAt: null },
        });
        if (!vehicle)
            throw new common_1.NotFoundException('Vehicle not found for this estimate');
    }
};
exports.EstimatesService = EstimatesService;
exports.EstimatesService = EstimatesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        job_cards_service_1.JobCardsService,
        messaging_service_1.MessagingService])
], EstimatesService);
//# sourceMappingURL=estimates.service.js.map