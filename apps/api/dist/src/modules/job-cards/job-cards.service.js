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
const job_card_status_transitions_1 = require("./job-card-status-transitions");
const VEHICLE_SUMMARY_SELECT = { id: true, registrationNo: true, brand: true, model: true };
const CUSTOMER_SUMMARY_SELECT = { id: true, name: true, mobile: true };
const JOB_CARD_INCLUDE = {
    vehicle: { select: VEHICLE_SUMMARY_SELECT },
    customer: { select: CUSTOMER_SUMMARY_SELECT },
    labourItems: true,
    statusHistory: { orderBy: { changedAt: 'desc' } },
    notes: { orderBy: { createdAt: 'desc' } },
};
let JobCardsService = class JobCardsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        await this.assertVehicleExists(dto.vehicleId);
        await this.assertCustomerExists(dto.customerId);
        if (dto.technicianId)
            await this.assertTechnicianExists(dto.technicianId);
        if (dto.inspectionId)
            await this.assertInspectionExists(dto.inspectionId);
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
                    startAt: dto.startAt ? new Date(dto.startAt) : undefined,
                    expectedDelivery: dto.expectedDelivery ? new Date(dto.expectedDelivery) : undefined,
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
                const rate = matched ? matched.labourRate : line.unitPrice;
                const gstRate = matched ? matched.gstRate : line.gstRate;
                const hours = line.quantity;
                await tx.jobCardLabour.create({
                    data: {
                        jobCardId: created.id,
                        labourItemId: matched?.id,
                        description: line.description,
                        hours,
                        rate,
                        gstRate,
                        lineTotal: new client_1.Prisma.Decimal(hours).mul(rate).toDecimalPlaces(2),
                    },
                });
            }
            return created;
        });
        return this.findOne(jobCard.id);
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const db = this.prisma.forTenant();
        const where = {
            deletedAt: null,
            ...(query.status ? { status: query.status } : {}),
            ...(query.technicianId ? { technicianId: query.technicianId } : {}),
            ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
            ...(query.customerId ? { customerId: query.customerId } : {}),
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
                include: { vehicle: { select: VEHICLE_SUMMARY_SELECT }, customer: { select: CUSTOMER_SUMMARY_SELECT } },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.jobCard.count({ where }),
        ]);
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    async findOne(id) {
        const jobCard = await this.prisma.forTenant().jobCard.findFirst({
            where: { id, deletedAt: null },
            include: JOB_CARD_INCLUDE,
        });
        if (!jobCard)
            throw new common_1.NotFoundException('Job card not found');
        return jobCard;
    }
    async update(id, dto) {
        await this.assertExists(id);
        if (dto.technicianId)
            await this.assertTechnicianExists(dto.technicianId);
        if (dto.inspectionId)
            await this.assertInspectionExists(dto.inspectionId);
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
        const jobCard = await this.assertExists(id);
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
        });
        return this.findOne(id);
    }
    async addLabour(jobCardId, dto) {
        await this.assertExists(jobCardId);
        const labourItem = await this.prisma.forTenant().labourItem.findFirst({
            where: { id: dto.labourItemId, deletedAt: null, isActive: true },
        });
        if (!labourItem)
            throw new common_1.NotFoundException('Labour item not found');
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
                lineTotal: new client_1.Prisma.Decimal(hours).mul(rate).toDecimalPlaces(2),
            },
        });
        return this.findOne(jobCardId);
    }
    async removeLabour(jobCardId, lineId) {
        await this.assertLabourLineExists(jobCardId, lineId);
        await this.prisma.forTenant().jobCardLabour.delete({ where: { id: lineId } });
        return this.findOne(jobCardId);
    }
    async addNote(jobCardId, dto, authorId) {
        await this.assertExists(jobCardId);
        await this.prisma.forTenant().jobCardNote.create({
            data: { jobCardId, authorId, note: dto.note },
        });
        return this.findOne(jobCardId);
    }
    async getStatusHistory(jobCardId) {
        await this.assertExists(jobCardId);
        return this.prisma.forTenant().jobCardStatusHistory.findMany({
            where: { jobCardId },
            orderBy: { changedAt: 'desc' },
        });
    }
    async assertExists(id) {
        const jobCard = await this.prisma.forTenant().jobCard.findFirst({ where: { id, deletedAt: null } });
        if (!jobCard)
            throw new common_1.NotFoundException('Job card not found');
        return jobCard;
    }
    async assertLabourLineExists(jobCardId, lineId) {
        const line = await this.prisma.forTenant().jobCardLabour.findFirst({ where: { id: lineId, jobCardId } });
        if (!line)
            throw new common_1.NotFoundException('Job card labour line not found');
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
};
exports.JobCardsService = JobCardsService;
exports.JobCardsService = JobCardsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], JobCardsService);
//# sourceMappingURL=job-cards.service.js.map