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
exports.WarrantyClaimsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenant_context_1 = require("../../prisma/tenant-context");
const messaging_service_1 = require("../messaging/messaging.service");
const templates_1 = require("../messaging/templates");
const warranty_status_1 = require("./warranty-status");
const warranty_claim_status_transitions_1 = require("./warranty-claim-status-transitions");
const CLAIM_INCLUDE = {
    claimJobCard: { select: { id: true, jobCardNumber: true, vehicleId: true, customerId: true } },
    originalJobCardPart: { include: { part: { select: { id: true, partNumber: true, name: true } }, jobCard: { select: { id: true, jobCardNumber: true, actualDelivery: true, odometer: true } } } },
    originalJobCardLabour: { include: { labourItem: { select: { id: true, code: true, description: true } }, jobCard: { select: { id: true, jobCardNumber: true, actualDelivery: true, odometer: true } } } },
    approvedByUser: { select: { id: true, name: true } },
};
let WarrantyClaimsService = class WarrantyClaimsService {
    constructor(prisma, messaging) {
        this.prisma = prisma;
        this.messaging = messaging;
    }
    async create(dto) {
        const hasOne = !!dto.originalJobCardPartId !== !!dto.originalJobCardLabourId;
        if (!hasOne) {
            throw new common_1.BadRequestException('Provide exactly one of originalJobCardPartId or originalJobCardLabourId');
        }
        const db = this.prisma.forTenant();
        const claimJobCard = await db.jobCard.findFirst({ where: { id: dto.claimJobCardId, deletedAt: null } });
        if (!claimJobCard)
            throw new common_1.NotFoundException('Job card not found');
        const original = dto.originalJobCardPartId
            ? await db.jobCardPart.findFirst({
                where: { id: dto.originalJobCardPartId },
                include: { part: true, jobCard: { select: { vehicleId: true, actualDelivery: true, odometer: true } } },
            })
            : await db.jobCardLabour.findFirst({
                where: { id: dto.originalJobCardLabourId },
                include: { labourItem: true, jobCard: { select: { vehicleId: true, actualDelivery: true, odometer: true } } },
            });
        if (!original)
            throw new common_1.NotFoundException('Original job card line not found');
        if (original.jobCard.vehicleId !== claimJobCard.vehicleId) {
            throw new common_1.BadRequestException('The original line and the claim job card must be for the same vehicle');
        }
        const vehicle = await db.vehicle.findFirstOrThrow({ where: { id: claimJobCard.vehicleId } });
        const warrantyKm = 'warrantyKm' in original ? original.warrantyKm : null;
        const status = (0, warranty_status_1.computeWarrantyStatus)(original.jobCard.actualDelivery, original.warrantyMonths, warrantyKm, original.jobCard.odometer, vehicle.odometerReading);
        if (!status.isActive) {
            throw new common_1.BadRequestException('This line is no longer under warranty — its coverage has expired');
        }
        return db.warrantyClaim.create({
            data: {
                claimJobCardId: dto.claimJobCardId,
                originalJobCardPartId: dto.originalJobCardPartId,
                originalJobCardLabourId: dto.originalJobCardLabourId,
                resolutionNotes: dto.resolutionNotes,
            },
            include: CLAIM_INCLUDE,
        });
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const db = this.prisma.forTenant();
        const where = {
            ...(query.status ? { status: query.status } : {}),
            ...(query.vehicleId ? { claimJobCard: { vehicleId: query.vehicleId } } : {}),
        };
        const [items, total] = await Promise.all([
            db.warrantyClaim.findMany({ where, include: CLAIM_INCLUDE, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
            db.warrantyClaim.count({ where }),
        ]);
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    async findOne(id) {
        const claim = await this.prisma.forTenant().warrantyClaim.findFirst({ where: { id }, include: CLAIM_INCLUDE });
        if (!claim)
            throw new common_1.NotFoundException('Warranty claim not found');
        return claim;
    }
    async update(id, dto, approvedByUserId) {
        const claim = await this.assertExists(id);
        if (dto.status && !(0, warranty_claim_status_transitions_1.isValidWarrantyClaimTransition)(claim.status, dto.status)) {
            throw new common_1.BadRequestException(`Cannot transition warranty claim from ${claim.status} to ${dto.status}`);
        }
        const isDecision = dto.status === client_1.WarrantyClaimStatus.APPROVED || dto.status === client_1.WarrantyClaimStatus.REJECTED;
        const updated = await this.prisma.forTenant().warrantyClaim.update({
            where: { id },
            data: {
                ...dto,
                ...(isDecision ? { approvedByUserId, approvedAt: new Date() } : {}),
            },
            include: CLAIM_INCLUDE,
        });
        if (isDecision) {
            await this.sendDecisionNotification(updated);
        }
        return updated;
    }
    async sendDecisionNotification(claim) {
        const tenantId = tenant_context_1.TenantContext.requireTenantId();
        const db = this.prisma.forTenant();
        const customer = await db.customer.findUnique({ where: { id: claim.claimJobCard.customerId } });
        if (!customer)
            return;
        const tenant = await this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
        const itemLabel = claim.originalJobCardPart?.part.name ?? claim.originalJobCardLabour?.labourItem?.description ?? claim.originalJobCardLabour?.description ?? 'the reported item';
        const content = (0, templates_1.warrantyClaimDecidedMessage)({
            workshopName: tenant?.name ?? 'AutoNexa',
            customerName: customer.name,
            itemLabel,
            approved: claim.status === client_1.WarrantyClaimStatus.APPROVED,
            isBillable: claim.isBillable,
        });
        await this.messaging.notifyCustomer(tenantId, 'warranty-claim.decided', { email: customer.email, mobile: customer.mobile, customerId: customer.id }, content, { type: 'WarrantyClaim', id: claim.id });
    }
    async assertExists(id) {
        const claim = await this.prisma.forTenant().warrantyClaim.findFirst({ where: { id } });
        if (!claim)
            throw new common_1.NotFoundException('Warranty claim not found');
        return claim;
    }
};
exports.WarrantyClaimsService = WarrantyClaimsService;
exports.WarrantyClaimsService = WarrantyClaimsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        messaging_service_1.MessagingService])
], WarrantyClaimsService);
//# sourceMappingURL=warranty-claims.service.js.map