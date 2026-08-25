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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VehiclesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenant_context_1 = require("../../prisma/tenant-context");
const storage_types_1 = require("../storage/storage.types");
const resolve_display_url_1 = require("../storage/resolve-display-url");
const warranty_status_1 = require("../warranty/warranty-status");
const vehicle_status_1 = require("./vehicle-status");
const next_service_due_1 = require("../messaging/next-service-due");
const LIST_INCLUDE = {
    customer: { select: { id: true, name: true, mobile: true } },
    jobCards: {
        where: { status: client_1.JobCardStatus.DELIVERED, deletedAt: null, actualDelivery: { not: null } },
        orderBy: { actualDelivery: 'desc' },
        take: 1,
        select: { actualDelivery: true, odometer: true },
    },
};
function toListRow(vehicle, now) {
    const { customer, jobCards, ...rest } = vehicle;
    const lastService = jobCards[0] ?? null;
    return {
        ...rest,
        customerId: customer.id,
        customerName: customer.name,
        customerMobile: customer.mobile,
        lastServiceAt: lastService?.actualDelivery ?? null,
        lastServiceOdometer: lastService?.odometer ?? null,
        insuranceStatus: (0, vehicle_status_1.computeExpiryStatus)(vehicle.insuranceExpiry, now),
        pucStatus: (0, vehicle_status_1.computeExpiryStatus)(vehicle.pucExpiry, now),
        status: (0, vehicle_status_1.computeVehicleStatus)(vehicle.insuranceExpiry, vehicle.pucExpiry, now),
    };
}
function expiryFilterWhere(field, filter, now) {
    if (!filter)
        return {};
    const soonThreshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    switch (filter) {
        case 'not_set':
            return { [field]: null };
        case 'expired':
            return { [field]: { lt: now } };
        case 'expiring_soon':
            return { [field]: { gte: now, lte: soonThreshold } };
        case 'active':
            return { [field]: { gt: soonThreshold } };
        default:
            return {};
    }
}
function statusFilterWhere(status, now) {
    if (status === 'NO_DATA')
        return { insuranceExpiry: null, pucExpiry: null };
    if (status === 'EXPIRED')
        return { OR: [{ insuranceExpiry: { lt: now } }, { pucExpiry: { lt: now } }] };
    if (status === 'ACTIVE') {
        return {
            AND: [
                { OR: [{ insuranceExpiry: { not: null } }, { pucExpiry: { not: null } }] },
                { OR: [{ insuranceExpiry: null }, { insuranceExpiry: { gte: now } }] },
                { OR: [{ pucExpiry: null }, { pucExpiry: { gte: now } }] },
            ],
        };
    }
    return {};
}
let VehiclesService = class VehiclesService {
    constructor(prisma, storage) {
        this.prisma = prisma;
        this.storage = storage;
    }
    async create(dto) {
        await this.assertCustomerExists(dto.customerId);
        return this.prisma.forTenant().vehicle.create({
            data: {
                ...dto,
                ...(dto.insuranceExpiry ? { insuranceExpiry: new Date(dto.insuranceExpiry) } : {}),
                ...(dto.pucExpiry ? { pucExpiry: new Date(dto.pucExpiry) } : {}),
                ...(dto.purchaseDate ? { purchaseDate: new Date(dto.purchaseDate) } : {}),
            },
        });
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const db = this.prisma.forTenant();
        const now = new Date();
        const where = {
            deletedAt: null,
            ...(query.customerId ? { customerId: query.customerId } : {}),
            ...statusFilterWhere(query.status, now),
            ...expiryFilterWhere('insuranceExpiry', query.insurance, now),
            ...expiryFilterWhere('pucExpiry', query.puc, now),
            ...(query.search
                ? {
                    OR: [
                        { registrationNo: { contains: query.search, mode: 'insensitive' } },
                        { vin: { contains: query.search, mode: 'insensitive' } },
                        { brand: { contains: query.search, mode: 'insensitive' } },
                        { model: { contains: query.search, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const [rows, total] = await Promise.all([
            db.vehicle.findMany({
                where,
                include: LIST_INCLUDE,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.vehicle.count({ where }),
        ]);
        const resolvedItems = await Promise.all(rows.map(async (vehicle) => ({ ...toListRow(vehicle, now), photoUrl: await (0, resolve_display_url_1.resolveDisplayUrl)(this.storage, vehicle.photoUrl) })));
        return { items: resolvedItems, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    async summary() {
        const tenantId = tenant_context_1.TenantContext.requireTenantId();
        const db = this.prisma.forTenant();
        const now = new Date();
        const soonThreshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const [total, insuranceActive, insuranceSoon, pucActive, pucSoon, vehiclesWithYear, tenantSettings, allVehicles] = await Promise.all([
            db.vehicle.count({ where: { deletedAt: null } }),
            db.vehicle.count({ where: { deletedAt: null, insuranceExpiry: { gte: now } } }),
            db.vehicle.count({ where: { deletedAt: null, insuranceExpiry: { gte: now, lte: soonThreshold } } }),
            db.vehicle.count({ where: { deletedAt: null, pucExpiry: { gte: now } } }),
            db.vehicle.count({ where: { deletedAt: null, pucExpiry: { gte: now, lte: soonThreshold } } }),
            db.vehicle.findMany({ where: { deletedAt: null, manufactureYear: { not: null } }, select: { manufactureYear: true } }),
            this.prisma.platform.tenantSettings.findUniqueOrThrow({ where: { tenantId } }),
            db.vehicle.findMany({
                where: { deletedAt: null },
                select: { id: true, odometerReading: true, serviceIntervalMonthsOverride: true, serviceIntervalKmOverride: true },
            }),
        ]);
        const currentYear = now.getUTCFullYear();
        const avgAge = vehiclesWithYear.length > 0
            ? vehiclesWithYear.reduce((sum, v) => sum + (currentYear - v.manufactureYear), 0) / vehiclesWithYear.length
            : 0;
        const lastServices = await db.jobCard.findMany({
            where: {
                vehicleId: { in: allVehicles.map((v) => v.id) },
                status: client_1.JobCardStatus.DELIVERED,
                deletedAt: null,
                actualDelivery: { not: null },
            },
            orderBy: { actualDelivery: 'desc' },
            select: { vehicleId: true, actualDelivery: true, odometer: true },
        });
        const lastServiceByVehicle = new Map();
        for (const jc of lastServices) {
            if (!lastServiceByVehicle.has(jc.vehicleId) && jc.actualDelivery) {
                lastServiceByVehicle.set(jc.vehicleId, { actualDelivery: jc.actualDelivery, odometer: jc.odometer });
            }
        }
        let upcomingService = 0;
        for (const vehicle of allVehicles) {
            const lastService = lastServiceByVehicle.get(vehicle.id);
            if (!lastService)
                continue;
            const intervalMonths = vehicle.serviceIntervalMonthsOverride ?? tenantSettings.serviceIntervalMonths;
            const intervalKm = vehicle.serviceIntervalKmOverride ?? tenantSettings.serviceIntervalKm;
            const { dueDate } = (0, next_service_due_1.computeServiceDue)({ completedAt: lastService.actualDelivery, odometer: lastService.odometer }, vehicle.odometerReading, intervalMonths, intervalKm);
            if (dueDate && dueDate.getTime() >= now.getTime() && dueDate.getTime() <= soonThreshold.getTime()) {
                upcomingService++;
            }
        }
        return {
            total,
            insuranceActive,
            insuranceExpiringSoon: insuranceSoon,
            pucActive,
            pucExpiringSoon: pucSoon,
            avgAgeYears: Math.round(avgAge * 10) / 10,
            upcomingService,
        };
    }
    async findOne(id) {
        const vehicle = await this.prisma.forTenant().vehicle.findFirst({
            where: { id, deletedAt: null },
            include: {
                customer: { select: { id: true, name: true, mobile: true, email: true } },
                documents: { orderBy: { uploadedAt: 'desc' } },
            },
        });
        if (!vehicle)
            throw new common_1.NotFoundException('Vehicle not found');
        const [photoUrl, documents] = await Promise.all([
            (0, resolve_display_url_1.resolveDisplayUrl)(this.storage, vehicle.photoUrl),
            Promise.all(vehicle.documents.map(async (doc) => ({ ...doc, fileUrl: (await (0, resolve_display_url_1.resolveDisplayUrl)(this.storage, doc.fileUrl)) }))),
        ]);
        return { ...vehicle, photoUrl, documents };
    }
    async getServiceHistory(id) {
        await this.assertExists(id);
        const db = this.prisma.forTenant();
        const [inspections, estimates, jobCards] = await Promise.all([
            db.inspection.findMany({ where: { vehicleId: id } }),
            db.estimate.findMany({ where: { vehicleId: id, deletedAt: null } }),
            db.jobCard.findMany({ where: { vehicleId: id, deletedAt: null } }),
        ]);
        const jobCardIds = jobCards.map((jc) => jc.id);
        const invoices = jobCardIds.length
            ? await db.invoice.findMany({ where: { jobCardId: { in: jobCardIds } } })
            : [];
        const timeline = [
            ...inspections.map((i) => ({
                date: i.createdAt,
                type: 'inspection',
                refId: i.id,
                description: `Inspection (${i.status})`,
            })),
            ...estimates.map((e) => ({
                date: e.createdAt,
                type: 'estimate',
                refId: e.id,
                description: e.jobDescription ?? 'Estimate',
                amount: Number(e.total),
            })),
            ...jobCards.map((jc) => ({
                date: jc.createdAt,
                type: 'job-card',
                refId: jc.id,
                description: jc.complaint ?? `Job card ${jc.jobCardNumber}`,
            })),
            ...invoices.map((inv) => ({
                date: inv.createdAt,
                type: 'invoice',
                refId: inv.id,
                description: `Invoice ${inv.invoiceNumber}`,
                amount: Number(inv.grandTotal),
            })),
        ].sort((a, b) => b.date.getTime() - a.date.getTime());
        return {
            vehicleId: id,
            timeline: timeline.map((entry) => ({ ...entry, date: entry.date.toISOString() })),
        };
    }
    async getWarrantyStatus(id) {
        const vehicle = await this.assertExists(id);
        const db = this.prisma.forTenant();
        const [labourLines, partLines] = await Promise.all([
            db.jobCardLabour.findMany({
                where: { jobCard: { vehicleId: id, deletedAt: null, actualDelivery: { not: null } } },
                include: {
                    labourItem: { select: { description: true } },
                    jobCard: { select: { id: true, jobCardNumber: true, actualDelivery: true } },
                    originalOfClaims: { select: { id: true }, take: 1 },
                },
            }),
            db.jobCardPart.findMany({
                where: { jobCard: { vehicleId: id, deletedAt: null, actualDelivery: { not: null } } },
                include: {
                    part: { select: { name: true, partNumber: true } },
                    jobCard: { select: { id: true, jobCardNumber: true, actualDelivery: true, odometer: true } },
                    originalOfClaims: { select: { id: true }, take: 1 },
                },
            }),
        ]);
        return {
            labour: labourLines.map((l) => {
                const result = (0, warranty_status_1.computeWarrantyStatus)(l.jobCard.actualDelivery, l.warrantyMonths, null, null, null);
                return {
                    jobCardLabourId: l.id,
                    jobCardId: l.jobCard.id,
                    jobCardNumber: l.jobCard.jobCardNumber,
                    description: l.description ?? l.labourItem?.description ?? 'Labour',
                    warrantyMonths: l.warrantyMonths,
                    expiresAt: result.expiresAt,
                    isActive: result.isActive,
                    existingClaimId: l.originalOfClaims[0]?.id ?? null,
                };
            }),
            parts: partLines.map((p) => {
                const result = (0, warranty_status_1.computeWarrantyStatus)(p.jobCard.actualDelivery, p.warrantyMonths, p.warrantyKm, p.jobCard.odometer, vehicle.odometerReading);
                return {
                    jobCardPartId: p.id,
                    jobCardId: p.jobCard.id,
                    jobCardNumber: p.jobCard.jobCardNumber,
                    partName: `${p.part.partNumber} — ${p.part.name}`,
                    warrantyMonths: p.warrantyMonths,
                    warrantyKm: p.warrantyKm,
                    expiresAt: result.expiresAt,
                    expiredByKm: result.expiredByKm,
                    isActive: result.isActive,
                    existingClaimId: p.originalOfClaims[0]?.id ?? null,
                };
            }),
        };
    }
    async update(id, dto) {
        await this.assertExists(id);
        return this.prisma.forTenant().vehicle.update({
            where: { id },
            data: {
                ...dto,
                ...(dto.insuranceExpiry ? { insuranceExpiry: new Date(dto.insuranceExpiry) } : {}),
                ...(dto.pucExpiry ? { pucExpiry: new Date(dto.pucExpiry) } : {}),
                ...(dto.purchaseDate ? { purchaseDate: new Date(dto.purchaseDate) } : {}),
            },
        });
    }
    async remove(id) {
        await this.assertExists(id);
        return this.prisma.forTenant().vehicle.update({ where: { id }, data: { deletedAt: new Date() } });
    }
    async addDocument(vehicleId, dto) {
        await this.assertExists(vehicleId);
        return this.prisma.forTenant().vehicleDocument.create({
            data: { vehicleId, ...dto },
        });
    }
    async assertExists(id) {
        const vehicle = await this.prisma.forTenant().vehicle.findFirst({ where: { id, deletedAt: null } });
        if (!vehicle)
            throw new common_1.NotFoundException('Vehicle not found');
        return vehicle;
    }
    async assertCustomerExists(customerId) {
        const customer = await this.prisma.forTenant().customer.findFirst({
            where: { id: customerId, deletedAt: null },
        });
        if (!customer)
            throw new common_1.NotFoundException('Customer not found for this vehicle');
    }
};
exports.VehiclesService = VehiclesService;
exports.VehiclesService = VehiclesService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(storage_types_1.STORAGE_SERVICE)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object])
], VehiclesService);
//# sourceMappingURL=vehicles.service.js.map