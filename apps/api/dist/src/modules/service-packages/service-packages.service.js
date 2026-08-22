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
    async findOne(id) {
        const pkg = await this.prisma.forTenant().servicePackage.findFirst({
            where: { id, deletedAt: null },
            include: PACKAGE_INCLUDE,
        });
        if (!pkg)
            throw new common_1.NotFoundException('Service package not found');
        return pkg;
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