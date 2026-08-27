import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PurchaseInvoiceStatus, PurchaseOrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { computePurchaseInvoiceOutstanding, sumPurchaseOutstanding } from '../../common/billing/purchase-outstanding';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { ListSuppliersQueryDto } from './dto/list-suppliers-query.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  // Cast needed because forTenant() injects tenantId into `data` at
  // runtime (see PrismaService) — the generated create type can't see that.
  create(dto: CreateSupplierDto) {
    return this.prisma.forTenant().supplier.create({
      data: { ...dto, isActive: dto.isActive ?? true } as unknown as Prisma.SupplierUncheckedCreateInput,
    });
  }

  async findAll(query: ListSuppliersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const db = this.prisma.forTenant();

    const where = {
      deletedAt: null,
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.paymentTerms ? { paymentTerms: query.paymentTerms } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { contactPerson: { contains: query.search, mode: 'insensitive' as const } },
              { mobile: { contains: query.search } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
              { gstin: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.supplier.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /**
   * Total/Active/Inactive counts, this month's purchase value (CANCELLED
   * orders excluded — they were never actually fulfilled), and the
   * distinct paymentTerms values actually on file (for the list page's
   * filter dropdown) — same "load once, derive the distinct list from it"
   * pattern as PartsService.summary()'s `brands`.
   */
  async summary() {
    const db = this.prisma.forTenant();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [total, active, inactive, poItemsThisMonth, suppliers] = await Promise.all([
      db.supplier.count({ where: { deletedAt: null } }),
      db.supplier.count({ where: { deletedAt: null, isActive: true } }),
      db.supplier.count({ where: { deletedAt: null, isActive: false } }),
      db.purchaseOrderItem.findMany({
        where: { purchaseOrder: { createdAt: { gte: monthStart, lt: monthEnd }, status: { not: PurchaseOrderStatus.CANCELLED } } },
        select: { lineTotal: true },
      }),
      db.supplier.findMany({ where: { deletedAt: null }, select: { paymentTerms: true } }),
    ]);

    const totalPurchasesThisMonth = poItemsThisMonth
      .reduce((sum, i) => sum.add(i.lineTotal), new Prisma.Decimal(0))
      .toDecimalPlaces(2);
    const paymentTermsOptions = Array.from(
      new Set(suppliers.map((s) => s.paymentTerms).filter((t): t is string => Boolean(t))),
    ).sort();

    return { total, active, inactive, totalPurchasesThisMonth: totalPurchasesThisMonth.toString(), paymentTermsOptions };
  }

  async findOne(id: string) {
    const supplier = await this.prisma.forTenant().supplier.findFirst({ where: { id, deletedAt: null } });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const db = this.prisma.forTenant();
    const [totalPurchaseOrders, poItems, partsSuppliedCount, lastPurchaseOrder, unpaidPurchaseInvoices] = await Promise.all([
      db.purchaseOrder.count({ where: { supplierId: id } }),
      db.purchaseOrderItem.findMany({
        where: { purchaseOrder: { supplierId: id, status: { not: PurchaseOrderStatus.CANCELLED } } },
        select: { lineTotal: true },
      }),
      db.part.count({ where: { supplierId: id, deletedAt: null } }),
      db.purchaseOrder.findFirst({ where: { supplierId: id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      db.purchaseInvoice.findMany({
        where: {
          purchaseOrder: { supplierId: id },
          status: { in: [PurchaseInvoiceStatus.UNPAID, PurchaseInvoiceStatus.PARTIALLY_PAID] },
        },
        select: { status: true, total: true, payments: { select: { amount: true } } },
      }),
    ]);

    const totalPurchaseValue = poItems.reduce((sum, i) => sum.add(i.lineTotal), new Prisma.Decimal(0)).toDecimalPlaces(2);
    const invoicesWithOutstanding = unpaidPurchaseInvoices.map((inv) => ({
      ...inv,
      outstanding: computePurchaseInvoiceOutstanding(inv),
    }));
    const outstandingPayable = sumPurchaseOutstanding(invoicesWithOutstanding);

    return {
      ...supplier,
      stats: {
        totalPurchaseOrders,
        totalPurchaseValue: totalPurchaseValue.toString(),
        outstandingPayable: outstandingPayable.toString(),
        partsSuppliedCount,
        lastPurchaseDate: lastPurchaseOrder?.createdAt ?? null,
      },
    };
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.assertExists(id);
    return this.prisma.forTenant().supplier.update({ where: { id }, data: dto });
  }

  /**
   * A supplier referenced by any purchase order, or set as any part's
   * preferred supplier, is never hard/soft-deleted — deactivate it
   * instead. Deleting one anyway would 404 it out of GET /suppliers/:id
   * (findOne filters deletedAt: null) while its purchase orders/parts
   * still hold a live supplierId FK, orphaning "View Supplier" links from
   * those records.
   */
  async remove(id: string) {
    await this.assertExists(id);
    const db = this.prisma.forTenant();
    const [purchaseOrderCount, partsCount] = await Promise.all([
      db.purchaseOrder.count({ where: { supplierId: id } }),
      db.part.count({ where: { supplierId: id, deletedAt: null } }),
    ]);
    if (purchaseOrderCount > 0 || partsCount > 0) {
      throw new ConflictException('This supplier has purchase orders or parts on file — deactivate it instead of deleting.');
    }
    return this.prisma.forTenant().supplier.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async assertExists(id: string) {
    const supplier = await this.prisma.forTenant().supplier.findFirst({ where: { id, deletedAt: null } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }
}
