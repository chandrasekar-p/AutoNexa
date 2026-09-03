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
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const low_stock_1 = require("./low-stock");
const part_stock_adjustment_1 = require("./part-stock-adjustment");
const part_stock_bounds_1 = require("./part-stock-bounds");
const CREATED_BY_SELECT = { createdBy: { select: { id: true, name: true } } };
let PartsService = class PartsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        if (!(0, part_stock_bounds_1.isValidStockBounds)(dto.minStock ?? 0, dto.maxStock)) {
            throw new common_1.BadRequestException('Minimum stock cannot be greater than maximum stock.');
        }
        try {
            return await this.prisma.forTenant().part.create({
                data: {
                    ...dto,
                    gstRate: dto.gstRate ?? 18,
                    isActive: dto.isActive ?? true,
                },
            });
        }
        catch (err) {
            throw this.translateUniqueConstraintError(err);
        }
    }
    translateUniqueConstraintError(err) {
        if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002' && 'meta' in err) {
            const target = err.meta?.target ?? [];
            if (target.includes('partNumber'))
                return new common_1.ConflictException('A part with this part number already exists.');
            if (target.includes('sku'))
                return new common_1.ConflictException('A part with this SKU already exists.');
            return new common_1.ConflictException('A part with these details already exists.');
        }
        return err;
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const db = this.prisma.forTenant();
        const stockStatus = query.stockStatus ?? (query.lowStock ? 'low_stock' : undefined);
        const where = {
            deletedAt: null,
            ...(query.categoryId ? { categoryId: query.categoryId } : {}),
            ...(query.supplierId ? { supplierId: query.supplierId } : {}),
            ...(query.brand ? { brand: query.brand } : {}),
            ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
            ...(query.minPrice !== undefined || query.maxPrice !== undefined
                ? {
                    sellingPrice: {
                        ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
                        ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
                    },
                }
                : {}),
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
        if (stockStatus) {
            const all = await db.part.findMany({ where, orderBy: { name: 'asc' } });
            const filtered = all.filter((p) => (0, low_stock_1.derivePartStockStatus)(p) === stockStatus);
            const total = filtered.length;
            const items = filtered.slice((page - 1) * pageSize, page * pageSize);
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
    async summary() {
        const db = this.prisma.forTenant();
        const parts = await db.part.findMany({
            where: { deletedAt: null, isActive: true },
            select: { currentStock: true, minStock: true, purchasePrice: true, brand: true },
        });
        const brands = Array.from(new Set(parts.map((p) => p.brand).filter((b) => Boolean(b)))).sort();
        let inStock = 0;
        let lowStock = 0;
        let outOfStock = 0;
        let inventoryValue = new client_1.Prisma.Decimal(0);
        for (const part of parts) {
            const status = (0, low_stock_1.derivePartStockStatus)(part);
            if (status === 'in_stock')
                inStock++;
            else if (status === 'low_stock')
                lowStock++;
            else
                outOfStock++;
            inventoryValue = inventoryValue.add(new client_1.Prisma.Decimal(part.currentStock).mul(part.purchasePrice));
        }
        return { totalParts: parts.length, inStock, lowStock, outOfStock, inventoryValue: inventoryValue.toString(), brands };
    }
    async findOne(id) {
        const part = await this.prisma.forTenant().part.findFirst({ where: { id, deletedAt: null } });
        if (!part)
            throw new common_1.NotFoundException('Part not found');
        return part;
    }
    async update(id, dto) {
        const existing = await this.assertExists(id);
        const effectiveMinStock = dto.minStock ?? existing.minStock;
        const effectiveMaxStock = dto.maxStock !== undefined ? dto.maxStock : existing.maxStock;
        if (!(0, part_stock_bounds_1.isValidStockBounds)(effectiveMinStock, effectiveMaxStock)) {
            throw new common_1.BadRequestException('Minimum stock cannot be greater than maximum stock.');
        }
        try {
            return await this.prisma.forTenant().part.update({ where: { id }, data: dto });
        }
        catch (err) {
            throw this.translateUniqueConstraintError(err);
        }
    }
    async remove(id) {
        await this.assertExists(id);
        return this.prisma.forTenant().part.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }
    async adjustStock(partId, dto, userId) {
        const db = this.prisma.forTenant();
        const delta = (0, part_stock_adjustment_1.computeAdjustmentDelta)(dto.direction, dto.quantity);
        const type = (0, part_stock_adjustment_1.mapAdjustmentReasonToTxnType)(dto.reason);
        const notes = (0, part_stock_adjustment_1.formatAdjustmentNotes)(dto.reason, dto.notes);
        return db.$transaction(async (tx) => {
            const part = await tx.part.findFirst({ where: { id: partId, deletedAt: null } });
            if (!part)
                throw new common_1.NotFoundException('Part not found');
            const updated = await tx.part.updateMany({
                where: { id: partId, currentStock: { gte: delta.negated() } },
                data: { currentStock: { increment: delta } },
            });
            if (updated.count === 0) {
                throw new common_1.BadRequestException('Insufficient stock for this adjustment');
            }
            await tx.inventoryTransaction.create({
                data: {
                    partId,
                    type,
                    quantity: delta,
                    refType: 'Adjustment',
                    createdById: userId,
                    notes,
                },
            });
            return tx.part.findFirstOrThrow({ where: { id: partId } });
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
                include: CREATED_BY_SELECT,
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