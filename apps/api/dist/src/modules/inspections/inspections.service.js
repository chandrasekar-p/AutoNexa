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
var InspectionsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InspectionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const storage_types_1 = require("../storage/storage.types");
const resolve_display_url_1 = require("../storage/resolve-display-url");
const default_inspection_checklist_1 = require("./default-inspection-checklist");
const INSPECTION_INCLUDE = { items: true, photos: { orderBy: { uploadedAt: 'desc' } } };
let InspectionsService = InspectionsService_1 = class InspectionsService {
    constructor(prisma, storage) {
        this.prisma = prisma;
        this.storage = storage;
        this.logger = new common_1.Logger(InspectionsService_1.name);
    }
    async create(dto) {
        await this.assertVehicleExists(dto.vehicleId);
        const db = this.prisma.forTenant();
        const inspection = await db.inspection.create({
            data: {
                vehicleId: dto.vehicleId,
                appointmentId: dto.appointmentId,
                technicianId: dto.technicianId,
                notes: dto.notes,
            },
        });
        const defaultItems = Object.entries(default_inspection_checklist_1.DEFAULT_INSPECTION_CHECKLIST).flatMap(([category, itemNames]) => itemNames.map((itemName) => ({ inspectionId: inspection.id, category, itemName })));
        await db.inspectionItem.createMany({
            data: defaultItems,
        });
        return this.findOne(inspection.id);
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const db = this.prisma.forTenant();
        const where = {
            ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.search ? { notes: { contains: query.search, mode: 'insensitive' } } : {}),
        };
        const [items, total] = await Promise.all([
            db.inspection.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.inspection.count({ where }),
        ]);
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    async findOne(id) {
        const inspection = await this.prisma.forTenant().inspection.findFirst({
            where: { id },
            include: INSPECTION_INCLUDE,
        });
        if (!inspection)
            throw new common_1.NotFoundException('Inspection not found');
        const photos = await Promise.all(inspection.photos.map(async (photo) => ({ ...photo, fileUrl: (await (0, resolve_display_url_1.resolveDisplayUrl)(this.storage, photo.fileUrl)) })));
        return { ...inspection, photos };
    }
    async update(id, dto) {
        await this.assertExists(id);
        await this.prisma.forTenant().inspection.update({ where: { id }, data: dto });
        return this.findOne(id);
    }
    async addItem(inspectionId, dto) {
        await this.assertExists(inspectionId);
        await this.prisma.forTenant().inspectionItem.create({
            data: { inspectionId, ...dto },
        });
        return this.findOne(inspectionId);
    }
    async updateItem(inspectionId, itemId, dto) {
        await this.assertItemExists(inspectionId, itemId);
        await this.prisma.forTenant().inspectionItem.update({ where: { id: itemId }, data: dto });
        return this.findOne(inspectionId);
    }
    async removeItem(inspectionId, itemId) {
        await this.assertItemExists(inspectionId, itemId);
        await this.prisma.forTenant().inspectionItem.delete({ where: { id: itemId } });
        return this.findOne(inspectionId);
    }
    async addPhoto(inspectionId, dto) {
        await this.assertExists(inspectionId);
        await this.prisma.forTenant().inspectionPhoto.create({
            data: { inspectionId, ...dto },
        });
        return this.findOne(inspectionId);
    }
    async removePhoto(inspectionId, photoId) {
        const photo = await this.assertPhotoExists(inspectionId, photoId);
        await this.prisma.forTenant().inspectionPhoto.delete({ where: { id: photoId } });
        try {
            await this.storage.delete(photo.fileUrl);
        }
        catch (err) {
            this.logger.warn(`Failed to delete storage object for inspection photo ${photoId}: ${err instanceof Error ? err.message : err}`);
        }
        return this.findOne(inspectionId);
    }
    async assertExists(id) {
        const inspection = await this.prisma.forTenant().inspection.findFirst({ where: { id } });
        if (!inspection)
            throw new common_1.NotFoundException('Inspection not found');
        return inspection;
    }
    async assertItemExists(inspectionId, itemId) {
        const item = await this.prisma.forTenant().inspectionItem.findFirst({ where: { id: itemId, inspectionId } });
        if (!item)
            throw new common_1.NotFoundException('Inspection item not found');
        return item;
    }
    async assertPhotoExists(inspectionId, photoId) {
        const photo = await this.prisma.forTenant().inspectionPhoto.findFirst({ where: { id: photoId, inspectionId } });
        if (!photo)
            throw new common_1.NotFoundException('Inspection photo not found');
        return photo;
    }
    async assertVehicleExists(vehicleId) {
        const vehicle = await this.prisma.forTenant().vehicle.findFirst({ where: { id: vehicleId, deletedAt: null } });
        if (!vehicle)
            throw new common_1.NotFoundException('Vehicle not found for this inspection');
    }
};
exports.InspectionsService = InspectionsService;
exports.InspectionsService = InspectionsService = InspectionsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(storage_types_1.STORAGE_SERVICE)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object])
], InspectionsService);
//# sourceMappingURL=inspections.service.js.map