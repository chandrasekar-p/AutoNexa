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
exports.PartsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let PartsService = class PartsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    create(dto) {
        return this.prisma.forTenant().part.create({
            data: {
                ...dto,
                gstRate: dto.gstRate ?? 18,
                isActive: dto.isActive ?? true,
            },
        });
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const db = this.prisma.forTenant();
        const where = {
            deletedAt: null,
            ...(query.categoryId ? { categoryId: query.categoryId } : {}),
            ...(query.supplierId ? { supplierId: query.supplierId } : {}),
            ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
            ...(query.search
                ? {
                    OR: [
                        { partNumber: { contains: query.search, mode: 'insensitive' } },
                        { sku: { contains: query.search, mode: 'insensitive' } },
                        { name: { contains: query.search, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        if (query.lowStock) {
            const all = await db.part.findMany({ where, orderBy: { name: 'asc' } });
            const lowStockItems = all.filter((p) => p.currentStock <= p.minStock);
            const total = lowStockItems.length;
            const items = lowStockItems.slice((page - 1) * pageSize, page * pageSize);
            return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
        }
        const [items, total] = await Promise.all([
            db.part.findMany({
                where,
                orderBy: { name: 'asc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.part.count({ where }),
        ]);
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    async findOne(id) {
        const part = await this.prisma.forTenant().part.findFirst({ where: { id, deletedAt: null } });
        if (!part)
            throw new common_1.NotFoundException('Part not found');
        return part;
    }
    async update(id, dto) {
        await this.assertExists(id);
        return this.prisma.forTenant().part.update({ where: { id }, data: dto });
    }
    async remove(id) {
        await this.assertExists(id);
        return this.prisma.forTenant().part.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
    async getStockLedger(partId, query) {
        await this.assertExists(partId);
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const db = this.prisma.forTenant();
        const where = { partId };
        const [items, total] = await Promise.all([
            db.inventoryTransaction.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.inventoryTransaction.count({ where }),
        ]);
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    async assertExists(id) {
        const part = await this.prisma.forTenant().part.findFirst({ where: { id, deletedAt: null } });
        if (!part)
            throw new common_1.NotFoundException('Part not found');
        return part;
    }
};
exports.PartsService = PartsService;
exports.PartsService = PartsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PartsService);
//# sourceMappingURL=parts.service.js.map