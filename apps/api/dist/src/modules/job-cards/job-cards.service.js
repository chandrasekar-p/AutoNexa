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
exports.JobCardsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenant_context_1 = require("../../prisma/tenant-context");
const generate_sequence_number_1 = require("../../common/sequence/generate-sequence-number");
const invoices_service_1 = require("../invoices/invoices.service");
const messaging_service_1 = require("../messaging/messaging.service");
const templates_1 = require("../messaging/templates");
const job_card_status_transitions_1 = require("./job-card-status-transitions");
const job_card_progress_1 = require("./job-card-progress");
const job_card_delay_1 = require("./job-card-delay");
const resolve_converted_labour_line_1 = require("./resolve-converted-labour-line");
const stock_guard_1 = require("./stock-guard");
const package_eligibility_1 = require("../service-packages/package-eligibility");
const VEHICLE_SUMMARY_SELECT = { id: true, registrationNo: true, brand: true, model: true, photoUrl: true };
const CUSTOMER_SUMMARY_SELECT = { id: true, name: true, mobile: true, email: true };
const STAFF_SUMMARY_SELECT = { id: true, name: true };
const TECHNICIAN_SUMMARY_SELECT = { id: true, user: { select: { name: true } } };
const JOB_CARD_INCLUDE = {
    vehicle: { select: VEHICLE_SUMMARY_SELECT },
    customer: { select: CUSTOMER_SUMMARY_SELECT },
    labourItems: true,
    parts: true,
    statusHistory: { orderBy: { changedAt: 'desc' } },
    notes: { orderBy: { createdAt: 'desc' } },
    invoice: { select: { id: true, invoiceNumber: true, status: true, grandTotal: true } },
};
const LIST_INCLUDE = {
    vehicle: { select: VEHICLE_SUMMARY_SELECT },
    customer: { select: CUSTOMER_SUMMARY_SELECT },
    technician: { select: TECHNICIAN_SUMMARY_SELECT },
    serviceAdvisor: { select: STAFF_SUMMARY_SELECT },
    labourItems: { select: { lineTotal: true, hours: true } },
    parts: { select: { lineTotal: true, part: { select: { currentStock: true, minStock: true } } } },
};
const TERMINAL_JOB_CARD_STATUSES = [client_1.JobCardStatus.DELIVERED, client_1.JobCardStatus.CANCELLED];
let JobCardsService = class JobCardsService {
    constructor(prisma, invoicesService, messaging) {
        this.prisma = prisma;
        this.invoicesService = invoicesService;
        this.messaging = messaging;
    }
    async create(dto) {
        await this.assertVehicleExists(dto.vehicleId);
        await this.assertCustomerExists(dto.customerId);
        if (dto.technicianId)
            await this.assertTechnicianExists(dto.technicianId);
        if (dto.inspectionId)
            await this.assertInspectionExists(dto.inspectionId);
        if (dto.redeemedPackageId)
            await this.assertPackageRedeemable(dto.redeemedPackageId, dto.customerId, dto.vehicleId);
        const tenantId = tenant_context_1.TenantContext.requireTenantId();
        const db = this.prisma.forTenant();
        const jobCard = await db.$transaction(async (tx) => {
            const settings = await tx.tenantSettings.findUniqueOrThrow({ where: { tenantId } });
            const jobCardNumber = await (0, generate_sequence_number_1.generateSequenceNumber)(tx, tenantId, 'JOB_CARD', settings.jobCardPrefix);
            const created = await tx.jobCard.create({
                data: {
                    vehicleId: dto.vehicleId,
                    customerId: dto.customerId,
                    inspectionId: dto.inspectionId,
                    technicianId: dto.technicianId,
                    serviceAdvisorId: dto.serviceAdvisorId,
                    odometer: dto.odometer,
                    complaint: dto.complaint,
                    customerRequest: dto.customerRequest,
                    estimatedWork: dto.estimatedWork,
                    redeemedPackageId: dto.redeemedPackageId,
                    startAt: dto.startAt ? new Date(dto.startAt) : undefined,
                    expectedDelivery: dto.expectedDelivery ? new Date(dto.expectedDelivery) : undefined,
                    priority: dto.priority,
                    jobCardNumber,
                    status: client_1.JobCardStatus.OPEN,
                },
            });
            await tx.jobCardStatusHistory.create({
                data: {
                    jobCardId: created.id,
                    fromStatus: null,
                    toStatus: client_1.JobCardStatus.OPEN,
                },
            });
            return created;
        });
        return this.findOne(jobCard.id);
    }
    async createFromEstimate(estimate) {
        const tenantId = tenant_context_1.TenantContext.requireTenantId();
        const db = this.prisma.forTenant();
        const jobCard = await db.$transaction(async (tx) => {
            const settings = await tx.tenantSettings.findUniqueOrThrow({ where: { tenantId } });
            const jobCardNumber = await (0, generate_sequence_number_1.generateSequenceNumber)(tx, tenantId, 'JOB_CARD', settings.jobCardPrefix);
            const created = await tx.jobCard.create({
                data: {
                    vehicleId: estimate.vehicleId,
                    customerId: estimate.customerId,
                    estimateId: estimate.id,
                    complaint: estimate.jobDescription,
                    jobCardNumber,
                    status: client_1.JobCardStatus.OPEN,
                },
            });
            await tx.jobCardStatusHistory.create({
                data: {
                    jobCardId: created.id,
                    fromStatus: null,
                    toStatus: client_1.JobCardStatus.OPEN,
                    notes: `Converted from estimate ${estimate.id}`,
                },
            });
            const labourLines = estimate.lineItems.filter((li) => li.itemType === client_1.EstimateLineItemType.LABOUR);
            for (const line of labourLines) {
                const matched = await tx.labourItem.findFirst({
                    where: { description: line.description, isActive: true },
                });
                const { labourItemId, rate, gstRate, hsnSac } = (0, resolve_converted_labour_line_1.resolveConvertedLabourLine)(line, matched);
                const hours = line.quantity;
                await tx.jobCardLabour.create({
                    data: {
                        jobCardId: created.id,
                        labourItemId,
                        description: line.description,
                        hours,
                        rate,
                        gstRate,
                        hsnSac,
                        lineTotal: new client_1.Prisma.Decimal(hours).mul(rate).toDecimalPlaces(2),
                    },
                });
            }
            return created;
        });
        return this.findOne(jobCard.id);
    }
    async findAll(query, currentUserId) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const db = this.prisma.forTenant();
        const scope = await this.getTechnicianScope(currentUserId);
        const dueDateRange = query.dueDate ? this.dueDateRange(query.dueDate) : null;
        const where = {
            deletedAt: null,
            ...(query.status ? { status: query.status } : dueDateRange ? { status: { notIn: TERMINAL_JOB_CARD_STATUSES } } : {}),
            ...(scope ? { technicianId: scope } : query.technicianId ? { technicianId: query.technicianId } : {}),
            ...(!scope
                ? query.mine
                    ? { serviceAdvisorId: currentUserId }
                    : query.serviceAdvisorId
                        ? { serviceAdvisorId: query.serviceAdvisorId }
                        : {}
                : {}),
            ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
            ...(query.customerId ? { customerId: query.customerId } : {}),
            ...(query.brand ? { vehicle: { brand: query.brand } } : {}),
            ...(dueDateRange ? { expectedDelivery: dueDateRange } : {}),
            ...(query.search
                ? {
                    OR: [
                        { jobCardNumber: { contains: query.search, mode: 'insensitive' } },
                        { complaint: { contains: query.search, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const [items, total] = await Promise.all([
            db.jobCard.findMany({
                where,
                include: LIST_INCLUDE,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.jobCard.count({ where }),
        ]);
        return { items: items.map((jc) => this.toListRow(jc)), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    dueDateRange(dueDate) {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (dueDate === 'today') {
            return { gte: todayStart, lt: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000) };
        }
        return { lt: todayStart };
    }
    toListRow(jobCard) {
        const { labourItems, parts, technician, ...rest } = jobCard;
        const estimatedTotal = [...labourItems.map((l) => l.lineTotal), ...parts.map((p) => p.lineTotal)].reduce((sum, line) => sum.add(line), new client_1.Prisma.Decimal(0));
        const estimatedHours = labourItems
            .reduce((sum, l) => sum.add(l.hours), new client_1.Prisma.Decimal(0))
            .toNumber();
        const partsPending = parts.filter((p) => p.part.currentStock <= p.part.minStock).length;
        return {
            ...rest,
            technician: technician ? { id: technician.id, name: technician.user.name } : null,
            estimatedTotal: estimatedTotal.toString(),
            estimatedHours,
            partsPending,
            partsTotal: parts.length,
            progressPercent: (0, job_card_progress_1.computeJobCardPipelineProgress)(jobCard.status),
            delayStatus: (0, job_card_delay_1.computeJobCardDelayStatus)(jobCard.expectedDelivery, jobCard.status),
            delayDays: jobCard.expectedDelivery ? (0, job_card_delay_1.computeJobCardDelayDays)(jobCard.expectedDelivery) : null,
        };
    }
    async summary(currentUserId) {
        const db = this.prisma.forTenant();
        const scope = await this.getTechnicianScope(currentUserId);
        const scopeWhere = scope ? { technicianId: scope } : {};
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const countByStatus = (status) => db.jobCard.count({ where: { deletedAt: null, status, ...scopeWhere } });
        const [open, diagnosis, waitingApproval, inProgress, waitingParts, readyForDelivery, deliveredThisMonth, cancelled] = await Promise.all([
            countByStatus(client_1.JobCardStatus.OPEN),
            countByStatus(client_1.JobCardStatus.DIAGNOSIS),
            countByStatus(client_1.JobCardStatus.WAITING_APPROVAL),
            countByStatus(client_1.JobCardStatus.IN_PROGRESS),
            countByStatus(client_1.JobCardStatus.WAITING_PARTS),
            countByStatus(client_1.JobCardStatus.READY_FOR_DELIVERY),
            db.jobCard.count({
                where: { deletedAt: null, status: client_1.JobCardStatus.DELIVERED, actualDelivery: { gte: monthStart, lt: monthEnd }, ...scopeWhere },
            }),
            countByStatus(client_1.JobCardStatus.CANCELLED),
        ]);
        return { open, diagnosis, waitingApproval, inProgress, waitingParts, readyForDelivery, deliveredThisMonth, cancelled };
    }
    async findOne(id, currentUserId) {
        const jobCard = await this.prisma.forTenant().jobCard.findFirst({
            where: { id, deletedAt: null },
            include: JOB_CARD_INCLUDE,
        });
        if (!jobCard)
            throw new common_1.NotFoundException('Job card not found');
        if (currentUserId)
            await this.assertTechnicianAccess(jobCard, currentUserId);
        return jobCard;
    }
    async update(id, dto, currentUserId) {
        const jobCard = await this.assertExists(id, currentUserId);
        if (dto.technicianId)
            await this.assertTechnicianExists(dto.technicianId);
        if (dto.inspectionId)
            await this.assertInspectionExists(dto.inspectionId);
        if (dto.redeemedPackageId)
            await this.assertPackageRedeemable(dto.redeemedPackageId, jobCard.customerId, jobCard.vehicleId);
        return this.prisma.forTenant().jobCard.update({
            where: { id },
            data: {
                ...dto,
                ...(dto.startAt ? { startAt: new Date(dto.startAt) } : {}),
                ...(dto.expectedDelivery ? { expectedDelivery: new Date(dto.expectedDelivery) } : {}),
            },
        });
    }
    async updateStatus(id, dto, changedByUserId) {
        const jobCard = await this.assertExists(id, changedByUserId);
        if (!(0, job_card_status_transitions_1.isValidJobCardTransition)(jobCard.status, dto.status)) {
            throw new common_1.BadRequestException(`Cannot transition job card from ${jobCard.status} to ${dto.status}`);
        }
        const db = this.prisma.forTenant();
        await db.$transaction(async (tx) => {
            await tx.jobCard.update({
                where: { id },
                data: {
                    status: dto.status,
                    ...(dto.status === client_1.JobCardStatus.DELIVERED ? { actualDelivery: new Date() } : {}),
                },
            });
            await tx.jobCardStatusHistory.create({
                data: {
                    jobCardId: id,
                    fromStatus: jobCard.status,
                    toStatus: dto.status,
                    changedByUserId,
                    notes: dto.notes,
                },
            });
            if (dto.status === client_1.JobCardStatus.DELIVERED && jobCard.redeemedPackageId) {
                const pkg = await tx.customerServicePackage.findUniqueOrThrow({ where: { id: jobCard.redeemedPackageId } });
                const guardedWhere = pkg.visitLimit === null
                    ? { id: jobCard.redeemedPackageId, status: 'ACTIVE' }
                    : { id: jobCard.redeemedPackageId, status: 'ACTIVE', visitsUsed: { lt: pkg.visitLimit } };
                const updated = await tx.customerServicePackage.updateMany({ where: guardedWhere, data: { visitsUsed: { increment: 1 } } });
                if (updated.count === 0) {
                    throw new common_1.BadRequestException('This service package is no longer active or has no visits remaining');
                }
            }
            if (dto.status === client_1.JobCardStatus.READY_FOR_DELIVERY) {
                await tx.notification.create({
                    data: {
                        userId: jobCard.serviceAdvisorId,
                        type: 'vehicle_ready',
                        title: 'Vehicle ready for delivery',
                        message: `Job card ${jobCard.jobCardNumber} is ready for delivery.`,
                        relatedEntityType: 'JobCard',
                        relatedEntityId: id,
                    },
                });
            }
        });
        const updated = await this.findOne(id);
        if (dto.status === client_1.JobCardStatus.READY_FOR_DELIVERY) {
            await this.sendReadyForPickup(updated);
        }
        return updated;
    }
    async sendReadyForPickup(jobCard) {
        const tenantId = tenant_context_1.TenantContext.requireTenantId();
        const tenant = await this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
        const content = (0, templates_1.jobCardReadyMessage)({
            workshopName: tenant?.name ?? 'AutoNexa',
            customerName: jobCard.customer.name,
            vehicleLabel: `${jobCard.vehicle.registrationNo} ${jobCard.vehicle.brand} ${jobCard.vehicle.model}`,
            jobCardNumber: jobCard.jobCardNumber,
        });
        await this.messaging.notifyCustomer(tenantId, 'job-card.ready', { email: jobCard.customer.email, mobile: jobCard.customer.mobile, customerId: jobCard.customer.id }, content, { type: 'JobCard', id: jobCard.id });
        await this.messaging.notifyOps(tenantId, 'job-card.ready', `Ready for pickup: ${jobCard.jobCardNumber} — ${jobCard.customer.name} — ${jobCard.vehicle.registrationNo}`, { type: 'JobCard', id: jobCard.id });
    }
    async addLabour(jobCardId, dto, currentUserId) {
        await this.assertExists(jobCardId, currentUserId);
        const labourItem = await this.prisma.forTenant().labourItem.findFirst({
            where: { id: dto.labourItemId, deletedAt: null, isActive: true },
        });
        if (!labourItem)
            throw new common_1.NotFoundException('Labour item not found');
        if (dto.warrantyClaimId)
            await this.assertClaimBelongsToJobCard(dto.warrantyClaimId, jobCardId);
        const hours = dto.hours ?? labourItem.standardHours;
        const rate = labourItem.labourRate;
        const gstRate = labourItem.gstRate;
        await this.prisma.forTenant().jobCardLabour.create({
            data: {
                jobCardId,
                labourItemId: labourItem.id,
                description: dto.description,
                hours,
                rate,
                gstRate,
                hsnSac: labourItem.sacCode,
                lineTotal: new client_1.Prisma.Decimal(hours).mul(rate).toDecimalPlaces(2),
                warrantyMonths: labourItem.warrantyPeriodMonths,
                warrantyClaimId: dto.warrantyClaimId,
            },
        });
        return this.findOne(jobCardId);
    }
    async removeLabour(jobCardId, lineId, currentUserId) {
        await this.assertExists(jobCardId, currentUserId);
        await this.assertLabourLineExists(jobCardId, lineId);
        await this.prisma.forTenant().jobCardLabour.delete({ where: { id: lineId } });
        return this.findOne(jobCardId);
    }
    async addPart(jobCardId, dto, currentUserId) {
        await this.assertExists(jobCardId, currentUserId);
        if (dto.warrantyClaimId)
            await this.assertClaimBelongsToJobCard(dto.warrantyClaimId, jobCardId);
        const db = this.prisma.forTenant();
        await db.$transaction(async (tx) => {
            const part = await tx.part.findFirst({ where: { id: dto.partId, deletedAt: null, isActive: true } });
            if (!part)
                throw new common_1.NotFoundException('Part not found');
            if (!(0, stock_guard_1.hasSufficientStock)(part.currentStock, dto.quantity)) {
                throw new common_1.BadRequestException('Insufficient stock');
            }
            const updated = await tx.part.updateMany({
                where: { id: part.id, currentStock: { gte: dto.quantity } },
                data: { currentStock: { decrement: dto.quantity } },
            });
            if (updated.count === 0) {
                throw new common_1.BadRequestException('Insufficient stock');
            }
            await tx.jobCardPart.create({
                data: {
                    jobCardId,
                    partId: part.id,
                    quantity: dto.quantity,
                    unitPrice: part.sellingPrice,
                    gstRate: part.gstRate,
                    hsnSac: part.hsnCode,
                    lineTotal: new client_1.Prisma.Decimal(dto.quantity).mul(part.sellingPrice).toDecimalPlaces(2),
                    warrantyMonths: part.warrantyPeriodMonths,
                    warrantyKm: part.warrantyKm,
                    warrantyClaimId: dto.warrantyClaimId,
                },
            });
            await tx.inventoryTransaction.create({
                data: {
                    partId: part.id,
                    type: client_1.InventoryTxnType.JOB_CARD_CONSUMPTION,
                    quantity: -dto.quantity,
                    refType: 'JobCard',
                    refId: jobCardId,
                },
            });
        });
        return this.findOne(jobCardId);
    }
    async removePart(jobCardId, lineId, currentUserId) {
        const jobCard = await this.assertExists(jobCardId, currentUserId);
        if (TERMINAL_JOB_CARD_STATUSES.includes(jobCard.status)) {
            throw new common_1.BadRequestException(`Cannot remove a part from a job card that is ${jobCard.status}`);
        }
        const line = await this.assertPartLineExists(jobCardId, lineId);
        const db = this.prisma.forTenant();
        await db.$transaction(async (tx) => {
            await tx.jobCardPart.delete({ where: { id: lineId } });
            await tx.part.update({
                where: { id: line.partId },
                data: { currentStock: { increment: line.quantity } },
            });
            await tx.inventoryTransaction.create({
                data: {
                    partId: line.partId,
                    type: client_1.InventoryTxnType.RETURN,
                    quantity: line.quantity,
                    refType: 'JobCard',
                    refId: jobCardId,
                },
            });
        });
        return this.findOne(jobCardId);
    }
    async addNote(jobCardId, dto, authorId) {
        await this.assertExists(jobCardId, authorId);
        await this.prisma.forTenant().jobCardNote.create({
            data: { jobCardId, authorId, note: dto.note },
        });
        return this.findOne(jobCardId);
    }
    async getStatusHistory(jobCardId, currentUserId) {
        await this.assertExists(jobCardId, currentUserId);
        return this.prisma.forTenant().jobCardStatusHistory.findMany({
            where: { jobCardId },
            orderBy: { changedAt: 'desc' },
        });
    }
    generateInvoice(jobCardId, dto) {
        return this.invoicesService.generateFromJobCard(jobCardId, dto);
    }
    async assertExists(id, currentUserId) {
        const jobCard = await this.prisma.forTenant().jobCard.findFirst({ where: { id, deletedAt: null } });
        if (!jobCard)
            throw new common_1.NotFoundException('Job card not found');
        await this.assertTechnicianAccess(jobCard, currentUserId);
        return jobCard;
    }
    async getTechnicianScope(userId) {
        const technician = await this.prisma.forTenant().technician.findUnique({ where: { userId } });
        return technician?.id ?? null;
    }
    async assertTechnicianAccess(jobCard, currentUserId) {
        const scope = await this.getTechnicianScope(currentUserId);
        if (scope && jobCard.technicianId !== scope) {
            throw new common_1.NotFoundException('Job card not found');
        }
    }
    async assertLabourLineExists(jobCardId, lineId) {
        const line = await this.prisma.forTenant().jobCardLabour.findFirst({ where: { id: lineId, jobCardId } });
        if (!line)
            throw new common_1.NotFoundException('Job card labour line not found');
        return line;
    }
    async assertPartLineExists(jobCardId, lineId) {
        const line = await this.prisma.forTenant().jobCardPart.findFirst({ where: { id: lineId, jobCardId } });
        if (!line)
            throw new common_1.NotFoundException('Job card part line not found');
        return line;
    }
    async assertVehicleExists(vehicleId) {
        const vehicle = await this.prisma.forTenant().vehicle.findFirst({ where: { id: vehicleId, deletedAt: null } });
        if (!vehicle)
            throw new common_1.NotFoundException('Vehicle not found for this job card');
    }
    async assertCustomerExists(customerId) {
        const customer = await this.prisma.forTenant().customer.findFirst({
            where: { id: customerId, deletedAt: null },
        });
        if (!customer)
            throw new common_1.NotFoundException('Customer not found for this job card');
    }
    async assertTechnicianExists(technicianId) {
        const technician = await this.prisma.forTenant().technician.findFirst({ where: { id: technicianId } });
        if (!technician)
            throw new common_1.NotFoundException('Technician not found for this job card');
    }
    async assertInspectionExists(inspectionId) {
        const inspection = await this.prisma.forTenant().inspection.findFirst({ where: { id: inspectionId } });
        if (!inspection)
            throw new common_1.NotFoundException('Inspection not found for this job card');
    }
    async assertPackageRedeemable(packageId, customerId, vehicleId) {
        const pkg = await this.prisma.forTenant().customerServicePackage.findFirst({ where: { id: packageId, customerId, vehicleId } });
        if (!pkg)
            throw new common_1.NotFoundException('Service package not found for this customer and vehicle');
        if (!(0, package_eligibility_1.isPackageRedeemable)(pkg.status, pkg.endDate, pkg.visitsUsed, pkg.visitLimit)) {
            throw new common_1.BadRequestException('This service package is not active or has no visits remaining');
        }
    }
    async assertClaimBelongsToJobCard(warrantyClaimId, jobCardId) {
        const claim = await this.prisma.forTenant().warrantyClaim.findFirst({ where: { id: warrantyClaimId, claimJobCardId: jobCardId } });
        if (!claim)
            throw new common_1.NotFoundException('Warranty claim not found on this job card');
    }
};
exports.JobCardsService = JobCardsService;
exports.JobCardsService = JobCardsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        invoices_service_1.InvoicesService,
        messaging_service_1.MessagingService])
], JobCardsService);
//# sourceMappingURL=job-cards.service.js.map