import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryTxnType, Prisma, PurchaseOrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../prisma/tenant-context';
import { generateSequenceNumber } from '../../common/sequence/generate-sequence-number';
import { isOverReceiving, rollupPurchaseOrderStatus } from './purchase-order-receiving';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { ListPurchaseOrdersQueryDto } from './dto/list-purchase-orders-query.dto';
import { ReceiveGoodsDto } from './dto/receive-goods.dto';

const SUPPLIER_SUMMARY_SELECT = { id: true, name: true, mobile: true, email: true } as const;
const PART_SUMMARY_SELECT = { id: true, partNumber: true, sku: true, name: true } as const;
const PURCHASE_ORDER_INCLUDE = {
  supplier: { select: SUPPLIER_SUMMARY_SELECT },
  items: { include: { part: { select: PART_SUMMARY_SELECT } } },
  goodsReceipts: { include: { items: true }, orderBy: { receivedAt: 'desc' as const } },
};
const RECEIVE_FLOW_ONLY_STATUSES: PurchaseOrderStatus[] = [
  PurchaseOrderStatus.PARTIALLY_RECEIVED,
  PurchaseOrderStatus.RECEIVED,
];

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // Casts below are needed because forTenant() injects tenantId into `data`
  // at runtime (see PrismaService) — the generated create types can't see that.
  async create(dto: CreatePurchaseOrderDto) {
    await this.assertSupplierExists(dto.supplierId);
    for (const item of dto.items) {
      await this.assertPartExists(item.partId);
    }

    const tenantId = TenantContext.requireTenantId();
    const db = this.prisma.forTenant();

    const po = await db.$transaction(async (tx) => {
      const settings = await tx.tenantSettings.findUniqueOrThrow({ where: { tenantId } });
      // Cast needed because `tx` here is forTenant()'s extended-client
      // transaction type, structurally distinct from the generated
      // Prisma.TransactionClient type generateSequenceNumber expects —
      // functionally identical at runtime, just a type-level mismatch
      // (see job-cards.service.ts for the same pattern, verified there).
      const poNumber = await generateSequenceNumber(
        tx as unknown as Prisma.TransactionClient,
        tenantId,
        'PURCHASE_ORDER',
        settings.poPrefix,
      );

      const created = await tx.purchaseOrder.create({
        data: {
          supplierId: dto.supplierId,
          expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : undefined,
          notes: dto.notes,
          poNumber,
          status: PurchaseOrderStatus.DRAFT,
        } as unknown as Prisma.PurchaseOrderUncheckedCreateInput,
      });

      await tx.purchaseOrderItem.createMany({
        data: dto.items.map((item) => ({
          purchaseOrderId: created.id,
          partId: item.partId,
          quantityOrdered: item.quantityOrdered,
          unitCost: item.unitCost,
          gstRate: item.gstRate,
          lineTotal: new Prisma.Decimal(item.quantityOrdered).mul(item.unitCost).toDecimalPlaces(2),
        })) as unknown as Prisma.PurchaseOrderItemCreateManyInput[],
      });

      return created;
    });

    return this.findOne(po.id);
  }

  async findAll(query: ListPurchaseOrdersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const db = this.prisma.forTenant();

    const where = {
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { poNumber: { contains: query.search, mode: 'insensitive' as const } } : {}),
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

  async findOne(id: string) {
    const po = await this.prisma.forTenant().purchaseOrder.findFirst({
      where: { id },
      include: PURCHASE_ORDER_INCLUDE,
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async update(id: string, dto: UpdatePurchaseOrderDto) {
    await this.assertExists(id);
    if (dto.status && RECEIVE_FLOW_ONLY_STATUSES.includes(dto.status)) {
      throw new BadRequestException(
        `${dto.status} is only set automatically by the goods receipt flow (POST :id/receive)`,
      );
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

  /**
   * Goods receipt: books a GoodsReceipt + its line items, increments each
   * received Part's currentStock, writes a PURCHASE_IN InventoryTransaction
   * per line, updates PurchaseOrderItem.quantityReceived, and rolls the
   * PurchaseOrder's status up to PARTIALLY_RECEIVED or RECEIVED — all in
   * one transaction. Over-receiving (more than what's still outstanding on
   * a line) is rejected before anything is written.
   */
  async receive(id: string, dto: ReceiveGoodsDto, receivedById: string) {
    await this.assertExists(id);
    const db = this.prisma.forTenant();

    await db.$transaction(async (tx) => {
      const existingItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
      const itemsById = new Map(existingItems.map((item) => [item.id, item]));

      for (const line of dto.items) {
        const item = itemsById.get(line.purchaseOrderItemId);
        if (!item) {
          throw new NotFoundException(`Purchase order item ${line.purchaseOrderItemId} not found on this order`);
        }
        if (isOverReceiving(item.quantityOrdered, item.quantityReceived, line.quantityReceived)) {
          const outstanding = item.quantityOrdered - item.quantityReceived;
          throw new BadRequestException(
            `Cannot receive ${line.quantityReceived} of item ${line.purchaseOrderItemId} — only ${outstanding} outstanding`,
          );
        }
      }

      const receipt = await tx.goodsReceipt.create({
        data: { purchaseOrderId: id, receivedById, notes: dto.notes } as unknown as Prisma.GoodsReceiptUncheckedCreateInput,
      });

      for (const line of dto.items) {
        const item = itemsById.get(line.purchaseOrderItemId)!;

        await tx.goodsReceiptItem.create({
          data: {
            goodsReceiptId: receipt.id,
            purchaseOrderItemId: item.id,
            quantityReceived: line.quantityReceived,
          } as unknown as Prisma.GoodsReceiptItemUncheckedCreateInput,
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
            type: InventoryTxnType.PURCHASE_IN,
            quantity: line.quantityReceived,
            refType: 'PurchaseOrder',
            refId: id,
            createdById: receivedById,
          } as unknown as Prisma.InventoryTransactionUncheckedCreateInput,
        });
      }

      const updatedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
      const newStatus = rollupPurchaseOrderStatus(updatedItems);
      await tx.purchaseOrder.update({ where: { id }, data: { status: newStatus } });
    });

    return this.findOne(id);
  }

  private async assertExists(id: string) {
    const po = await this.prisma.forTenant().purchaseOrder.findFirst({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  private async assertSupplierExists(supplierId: string) {
    const supplier = await this.prisma.forTenant().supplier.findFirst({
      where: { id: supplierId, deletedAt: null },
    });
    if (!supplier) throw new NotFoundException('Supplier not found for this purchase order');
  }

  private async assertPartExists(partId: string) {
    const part = await this.prisma.forTenant().part.findFirst({ where: { id: partId, deletedAt: null } });
    if (!part) throw new NotFoundException('Part not found for this purchase order');
  }
}
