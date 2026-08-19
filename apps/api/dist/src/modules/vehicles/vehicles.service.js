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
exports.VehiclesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let VehiclesService = class VehiclesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        await this.assertCustomerExists(dto.customerId);
        return this.prisma.forTenant().vehicle.create({
            data: dto,
        });
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const db = this.prisma.forTenant();
        const where = {
            deletedAt: null,
            ...(query.customerId ? { customerId: query.customerId } : {}),
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
        const [items, total] = await Promise.all([
            db.vehicle.findMany({
                where,
                include: { customer: { select: { id: true, name: true, mobile: true } } },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.vehicle.count({ where }),
        ]);
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
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
        return vehicle;
    }
    async getServiceHistory(id) {
        await this.findOne(id);
        return {
            vehicleId: id,
            timeline: [],
        };
    }
    async update(id, dto) {
        await this.assertExists(id);
        return this.prisma.forTenant().vehicle.update({ where: { id }, data: dto });
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VehiclesService);
//# sourceMappingURL=vehicles.service.js.map