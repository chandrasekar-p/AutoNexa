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
exports.ServicePackagesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const PACKAGE_INCLUDE = {
    includedLabourItems: { include: { labourItem: { select: { id: true, code: true, description: true } } } },
    includedParts: { include: { part: { select: { id: true, partNumber: true, name: true } } } },
    includedPartCategories: { include: { partCategory: { select: { id: true, name: true } } } },
};
let ServicePackagesService = class ServicePackagesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const db = this.prisma.forTenant();
        const created = await db.servicePackage.create({
            data: {
                name: dto.name,
                description: dto.description,
                price: dto.price,
                gstRate: dto.gstRate,
                validityMonths: dto.validityMonths,
                visitLimit: dto.visitLimit,
                isActive: dto.isActive ?? true,
            },
        });
        await this.replaceInclusions(created.id, dto);
        return this.findOne(created.id);
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const db = this.prisma.forTenant();
        const where = {
            deletedAt: null,
            ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
            ...(query.validityMonths !== undefined ? { validityMonths: query.validityMonths } : {}),
            ...(query.visitLimit !== undefined
                ? { visitLimit: query.visitLimit === 'unlimited' ? null : Number(query.visitLimit) }
                : {}),
            ...(query.minPrice !== undefined || query.maxPrice !== undefined
                ? {
                    price: {
                        ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
                        ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
                    },
                }
                : {}),
            ...(query.search
                ? {
                    OR: [
                        { name: { contains: query.search, mode: 'insensitive' } },
                        { description: { contains: query.search, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const [items, total] = await Promise.all([
            db.servicePackage.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
            db.servicePackage.count({ where }),
        ]);
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    async summary() {
        const db = this.prisma.forTenant();
        const [total, active, inactive, packages, soldGrouped] = await Promise.all([
            db.servicePackage.count({ where: { deletedAt: null } }),
            db.servicePackage.count({ where: { deletedAt: null, isActive: true } }),
            db.servicePackage.count({ where: { deletedAt: null, isActive: false } }),
            db.servicePackage.findMany({ where: { deletedAt: null }, select: { price: true, validityMonths: true, visitLimit: true } }),
            db.customerServicePackage.groupBy({ by: ['servicePackageId'], _count: { _all: true } }),
        ]);
        const avgPrice = packages.length > 0
            ? packages.reduce((sum, p) => sum.add(p.price), new client_1.Prisma.Decimal(0)).div(packages.length).toDecimalPlaces(2)
            : new client_1.Prisma.Decimal(0);
        const validityOptions = Array.from(new Set(packages.map((p) => p.validityMonths))).sort((a, b) => a - b);
        const visitLimitOptions = Array.from(new Set(packages.map((p) => p.visitLimit).filter((v) => v != null))).sort((a, b) => a - b);
        let mostPopular = null;
        if (soldGrouped.length > 0) {
            const top = soldGrouped.reduce((max, g) => (g._count._all > max._count._all ? g : max), soldGrouped[0]);
            const pkg = await db.servicePackage.findFirst({ where: { id: top.servicePackageId }, select: { id: true, name: true } });
            if (pkg)
                mostPopular = { id: pkg.id, name: pkg.name, soldCount: top._count._all };
        }
        return {
            total,
            active,
            inactive,
            avgPrice: avgPrice.toString(),
            validityOptions,
            visitLimitOptions,
            mostPopular,
        };
    }
    async findOne(id) {
        const pkg = await this.prisma.forTenant().servicePackage.findFirst({
            where: { id, deletedAt: null },
            include: PACKAGE_INCLUDE,
        });
        if (!pkg)
            throw new common_1.NotFoundException('Service package not found');
        const db = this.prisma.forTenant();
        const [soldCount, activeSoldCount, soldInvoices] = await Promise.all([
            db.customerServicePackage.count({ where: { servicePackageId: id } }),
            db.customerServicePackage.count({ where: { servicePackageId: id, status: 'ACTIVE' } }),
            db.customerServicePackage.findMany({ where: { servicePackageId: id }, select: { purchaseInvoice: { select: { grandTotal: true } } } }),
        ]);
        const totalRevenue = soldInvoices
            .reduce((sum, s) => sum.add(s.purchaseInvoice.grandTotal), new client_1.Prisma.Decimal(0))
            .toDecimalPlaces(2);
        return { ...pkg, stats: { soldCount, activeSoldCount, totalRevenue: totalRevenue.toString() } };
    }
    async update(id, dto) {
        await this.assertExists(id);
        const { labourItemIds, partIds, partCategoryIds, ...fields } = dto;
        await this.prisma.forTenant().servicePackage.update({ where: { id }, data: fields });
        if (labourItemIds !== undefined || partIds !== undefined || partCategoryIds !== undefined) {
            await this.replaceInclusions(id, dto);
        }
        return this.findOne(id);
    }
    async remove(id) {
        await this.assertExists(id);
        const soldCount = await this.prisma.forTenant().customerServicePackage.count({ where: { servicePackageId: id } });
        if (soldCount > 0) {
            throw new common_1.ConflictException('This package has been sold to customers — deactivate it instead of deleting.');
        }
        return this.prisma.forTenant().servicePackage.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    }
    async replaceInclusions(servicePackageId, dto) {
        const db = this.prisma.forTenant();
        if (dto.labourItemIds !== undefined) {
            await db.servicePackageLabourItem.deleteMany({ where: { servicePackageId } });
            if (dto.labourItemIds.length > 0) {
                await db.servicePackageLabourItem.createMany({
                    data: dto.labourItemIds.map((labourItemId) => ({ servicePackageId, labourItemId })),
                });
            }
        }
        if (dto.partIds !== undefined) {
            await db.servicePackagePart.deleteMany({ where: { servicePackageId } });
            if (dto.partIds.length > 0) {
                await db.servicePackagePart.createMany({
                    data: dto.partIds.map((partId) => ({ servicePackageId, partId })),
                });
            }
        }
        if (dto.partCategoryIds !== undefined) {
            await db.servicePackagePartCategory.deleteMany({ where: { servicePackageId } });
            if (dto.partCategoryIds.length > 0) {
                await db.servicePackagePartCategory.createMany({
                    data: dto.partCategoryIds.map((partCategoryId) => ({ servicePackageId, partCategoryId })),
                });
            }
        }
    }
    async assertExists(id) {
        const pkg = await this.prisma.forTenant().servicePackage.findFirst({ where: { id, deletedAt: null } });
        if (!pkg)
            throw new common_1.NotFoundException('Service package not found');
        return pkg;
    }
};
exports.ServicePackagesService = ServicePackagesService;
exports.ServicePackagesService = ServicePackagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ServicePackagesService);
//# sourceMappingURL=service-packages.service.js.map