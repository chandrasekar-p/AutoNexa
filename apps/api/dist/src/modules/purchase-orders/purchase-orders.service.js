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
exports.PurchaseOrdersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
const tenant_context_1 = require("../../prisma/tenant-context");
const generate_sequence_number_1 = require("../../common/sequence/generate-sequence-number");
const purchase_order_receiving_1 = require("./purchase-order-receiving");
const SUPPLIER_SUMMARY_SELECT = { id: true, name: true, mobile: true, email: true };
const PART_SUMMARY_SELECT = { id: true, partNumber: true, sku: true, name: true };
const PURCHASE_ORDER_INCLUDE = {
    supplier: { select: SUPPLIER_SUMMARY_SELECT },
    items: { include: { part: { select: PART_SUMMARY_SELECT } } },
    goodsReceipts: { include: { items: true }, orderBy: { receivedAt: 'desc' } },
};
const RECEIVE_FLOW_ONLY_STATUSES = [
    client_1.PurchaseOrderStatus.PARTIALLY_RECEIVED,
    client_1.PurchaseOrderStatus.RECEIVED,
];
let PurchaseOrdersService = class PurchaseOrdersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        await this.assertSupplierExists(dto.supplierId);
        for (const item of dto.items) {
            await this.assertPartExists(item.partId);
        }
        const tenantId = tenant_context_1.TenantContext.requireTenantId();
        const db = this.prisma.forTenant();
        const po = await db.$transaction(async (tx) => {
            const settings = await tx.tenantSettings.findUniqueOrThrow({ where: { tenantId } });
            const poNumber = await (0, generate_sequence_number_1.generateSequenceNumber)(tx, tenantId, 'PURCHASE_ORDER', settings.poPrefix);
            const created = await tx.purchaseOrder.create({
                data: {
                    supplierId: dto.supplierId,
                    expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : undefined,
                    notes: dto.notes,
                    poNumber,
                    status: client_1.PurchaseOrderStatus.DRAFT,
                },
            });
            await tx.purchaseOrderItem.createMany({
                data: dto.items.map((item) => ({
                    purchaseOrderId: created.id,
                    partId: item.partId,
                    quantityOrdered: item.quantityOrdered,
                    unitCost: item.unitCost,
                    gstRate: item.gstRate,
                    lineTotal: new client_1.Prisma.Decimal(item.quantityOrdered).mul(item.unitCost).toDecimalPlaces(2),
                })),
            });
            return created;
        });
        return this.findOne(po.id);
    }
    async findAll(query) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const db = this.prisma.forTenant();
        const where = {
            ...(query.supplierId ? { supplierId: query.supplierId } : {}),
            ...(query.status ? { status: query.status } : {}),
            ...(query.search ? { poNumber: { contains: query.search, mode: 'insensitive' } } : {}),
        };
        const [items, total] = await Promise.all([
            db.purchaseOrder.findMany({
                where,
                include: { supplier: { select: SUPPLIER_SUMMARY_SELECT } },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            db.purchaseOrder.count({ where }),
        ]);
        return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
    }
    async findOne(id) {
        const po = await this.prisma.forTenant().purchaseOrder.findFirst({
            where: { id },
            include: PURCHASE_ORDER_INCLUDE,
        });
        if (!po)
            throw new common_1.NotFoundException('Purchase order not found');
        return po;
    }
    async update(id, dto) {
        await this.assertExists(id);
        if (dto.status && RECEIVE_FLOW_ONLY_STATUSES.includes(dto.status)) {
            throw new common_1.BadRequestException(`${dto.status} is only set automatically by the goods receipt flow (POST :id/receive)`);
        }
        return this.prisma.forTenant().purchaseOrder.update({
            where: { id },
            data: {
                ...(dto.expectedDeliveryDate !== undefined
                    ? { expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null }
                    : {}),
                ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
                ...(dto.status ? { status: dto.status } : {}),
            },
        });
    }
    async receive(id, dto, receivedById) {
        await this.assertExists(id);
        const db = this.prisma.forTenant();
        await db.$transaction(async (tx) => {
            const existingItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
            const itemsById = new Map(existingItems.map((item) => [item.id, item]));
            for (const line of dto.items) {
                const item = itemsById.get(line.purchaseOrderItemId);
                if (!item) {
                    throw new common_1.NotFoundException(`Purchase order item ${line.purchaseOrderItemId} not found on this order`);
                }
                if ((0, purchase_order_receiving_1.isOverReceiving)(item.quantityOrdered, item.quantityReceived, line.quantityReceived)) {
                    const outstanding = item.quantityOrdered - item.quantityReceived;
                    throw new common_1.BadRequestException(`Cannot receive ${line.quantityReceived} of item ${line.purchaseOrderItemId} — only ${outstanding} outstanding`);
                }
            }
            const receipt = await tx.goodsReceipt.create({
                data: { purchaseOrderId: id, receivedById, notes: dto.notes },
            });
            for (const line of dto.items) {
                const item = itemsById.get(line.purchaseOrderItemId);
                await tx.goodsReceiptItem.create({
                    data: {
                        goodsReceiptId: receipt.id,
                        purchaseOrderItemId: item.id,
                        quantityReceived: line.quantityReceived,
                    },
                });
                await tx.purchaseOrderItem.update({
                    where: { id: item.id },
                    data: { quantityReceived: { increment: line.quantityReceived } },
                });
                await tx.part.update({
                    where: { id: item.partId },
                    data: { currentStock: { increment: line.quantityReceived } },
                });
                await tx.inventoryTransaction.create({
                    data: {
                        partId: item.partId,
                        type: client_1.InventoryTxnType.PURCHASE_IN,
                        quantity: line.quantityReceived,
                        refType: 'PurchaseOrder',
                        refId: id,
                        createdById: receivedById,
                    },
                });
            }
            const updatedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
            const newStatus = (0, purchase_order_receiving_1.rollupPurchaseOrderStatus)(updatedItems);
            await tx.purchaseOrder.update({ where: { id }, data: { status: newStatus } });
        });
        return this.findOne(id);
    }
    async assertExists(id) {
        const po = await this.prisma.forTenant().purchaseOrder.findFirst({ where: { id } });
        if (!po)
            throw new common_1.NotFoundException('Purchase order not found');
        return po;
    }
    async assertSupplierExists(supplierId) {
        const supplier = await this.prisma.forTenant().supplier.findFirst({
            where: { id: supplierId, deletedAt: null },
        });
        if (!supplier)
            throw new common_1.NotFoundException('Supplier not found for this purchase order');
    }
    async assertPartExists(partId) {
        const part = await this.prisma.forTenant().part.findFirst({ where: { id: partId, deletedAt: null } });
        if (!part)
            throw new common_1.NotFoundException('Part not found for this purchase order');
    }
};
exports.PurchaseOrdersService = PurchaseOrdersService;
exports.PurchaseOrdersService = PurchaseOrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PurchaseOrdersService);
//# sourceMappingURL=purchase-orders.service.js.map