import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { ListPartsQueryDto } from './dto/list-parts-query.dto';
import { StockLedgerQueryDto } from './dto/stock-ledger-query.dto';
import { AdjustPartStockDto } from './dto/adjust-part-stock.dto';
import { derivePartStockStatus } from './low-stock';
import { mapAdjustmentReasonToTxnType, computeAdjustmentDelta, formatAdjustmentNotes } from './part-stock-adjustment';
import { isValidStockBounds } from './part-stock-bounds';

const CREATED_BY_SELECT = { createdBy: { select: { id: true, name: true } } } as const;

@Injectable()
export class PartsService {
  constructor(private readonly prisma: PrismaService) {}

  // Cast needed because forTenant() injects tenantId into `data` at
  // runtime (see PrismaService) — the generated create type can't see that.
  async create(dto: CreatePartDto) {
    if (!isValidStockBounds(dto.minStock ?? 0, dto.maxStock)) {
      throw new BadRequestException('Minimum stock cannot be greater than maximum stock.');
    }
    try {
      return await this.prisma.forTenant().part.create({
        data: {
          ...dto,
          gstRate: dto.gstRate ?? 18,
          isActive: dto.isActive ?? true,
        } as unknown as Prisma.PartUncheckedCreateInput,
      });
    } catch (err) {
      throw this.translateUniqueConstraintError(err);
    }
  }

  /**
   * Part.partNumber/sku both have a real @@unique([tenantId, ...])
   * constraint (sku's added specifically for this — see the
   * unique_part_sku migration), but a bare create()/update() previously
   * let a violation surface as an opaque 500 instead of the clean 409 the
   * spec's own "no duplicate part numbers/SKUs" check calls for.
   */
  private translateUniqueConstraintError(err: unknown): Error {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002' && 'meta' in err) {
      const target = (err.meta as { target?: string[] } | undefined)?.target ?? [];
      if (target.includes('partNumber')) return new ConflictException('A part with this part number already exists.');
      if (target.includes('sku')) return new ConflictException('A part with this SKU already exists.');
      return new ConflictException('A part with these details already exists.');
    }
    return err as Error;
  }

  async findAll(query: ListPartsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const db = this.prisma.forTenant();
    // Deprecated boolean alias — no known caller uses it, kept only as a
    // precaution (see ListPartsQueryDto's own doc comment).
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
              { partNumber: { contains: query.search, mode: 'insensitive' as const } },
              { sku: { contains: query.search, mode: 'insensitive' as const } },
              { name: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    if (stockStatus) {
      // Prisma's query builder has no field-to-field comparison operator
      // (currentStock vs. minStock references two columns on the same
      // row, and "in_stock" is exactly as column-comparing as the other
      // two), so this filter is applied in application code after
      // fetching every row matching the other filters, then paginated in
      // memory — same approach the pre-existing lowStock filter already
      // used, just extended to all three buckets via derivePartStockStatus.
      const all = await db.part.findMany({ where, orderBy: { name: 'asc' } });
      const filtered = all.filter((p) => derivePartStockStatus(p) === stockStatus);
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

  /**
   * KPI cards for the Parts & Inventory page, plus the distinct brand list
   * (this query already loads every part into memory for the KPI loop, so
   * a separate distinct-brands query/endpoint would be redundant).
   * Scoped to active parts only — same default the list view's own
   * isActive=true filter uses, so a KPI count and clicking through to it
   * always agree; an inactive part isn't operationally "in stock" or
   * "low" in a way anyone would act on. inventoryValue is
   * Σ currentStock × purchasePrice — never sellingPrice, see the schema's
   * own accounting convention.
   */
  async summary() {
    const db = this.prisma.forTenant();
    const parts = await db.part.findMany({
      where: { deletedAt: null, isActive: true },
      select: { currentStock: true, minStock: true, purchasePrice: true, brand: true },
    });
    const brands = Array.from(new Set(parts.map((p) => p.brand).filter((b): b is string => Boolean(b)))).sort();

    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let inventoryValue = new Prisma.Decimal(0);
    for (const part of parts) {
      const status = derivePartStockStatus(part);
      if (status === 'in_stock') inStock++;
      else if (status === 'low_stock') lowStock++;
      else outOfStock++;
      inventoryValue = inventoryValue.add(new Prisma.Decimal(part.currentStock).mul(part.purchasePrice));
    }

    return { totalParts: parts.length, inStock, lowStock, outOfStock, inventoryValue: inventoryValue.toString(), brands };
  }

  async findOne(id: string) {
    const part = await this.prisma.forTenant().part.findFirst({ where: { id, deletedAt: null } });
    if (!part) throw new NotFoundException('Part not found');
    return part;
  }

  async update(id: string, dto: UpdatePartDto) {
    const existing = await this.assertExists(id);
    // A partial update might touch only one of minStock/maxStock — the
    // bounds check has to run against the merged result, not the dto's
    // own fields in isolation, or e.g. lowering maxStock below the
    // existing minStock would sail through unchecked.
    const effectiveMinStock = dto.minStock ?? existing.minStock;
    const effectiveMaxStock = dto.maxStock !== undefined ? dto.maxStock : existing.maxStock;
    if (!isValidStockBounds(effectiveMinStock, effectiveMaxStock)) {
      throw new BadRequestException('Minimum stock cannot be greater than maximum stock.');
    }
    try {
      return await this.prisma.forTenant().part.update({ where: { id }, data: dto });
    } catch (err) {
      throw this.translateUniqueConstraintError(err);
    }
  }

  async remove(id: string) {
    await this.assertExists(id);
    return this.prisma.forTenant().part.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * The one real gap this module had: CreatePartDto/UpdatePartDto
   * deliberately never accept currentStock (see that DTO's own comment),
   * so until now there was no way to record an opening balance or correct
   * a miscount. This is the missing write path — same guarded-UPDATE
   * shape as JobCardsService.addPart's stock decrement, so a concurrent
   * Stock Out (here or from a job card) can't drive currentStock negative.
   */
  async adjustStock(partId: string, dto: AdjustPartStockDto, userId: string) {
    const db = this.prisma.forTenant();
    const delta = computeAdjustmentDelta(dto.direction, dto.quantity);
    const type = mapAdjustmentReasonToTxnType(dto.reason);
    const notes = formatAdjustmentNotes(dto.reason, dto.notes);

    return db.$transaction(async (tx) => {
      const part = await tx.part.findFirst({ where: { id: partId, deletedAt: null } });
      if (!part) throw new NotFoundException('Part not found');

      const updated = await tx.part.updateMany({
        where: { id: partId, currentStock: { gte: delta.negated() } },
        data: { currentStock: { increment: delta } },
      });
      if (updated.count === 0) {
        throw new BadRequestException('Insufficient stock for this adjustment');
      }

      await tx.inventoryTransaction.create({
        data: {
          partId,
          type,
          quantity: delta,
          refType: 'Adjustment',
          createdById: userId,
          notes,
        } as unknown as Prisma.InventoryTransactionUncheckedCreateInput,
      });

      return tx.part.findFirstOrThrow({ where: { id: partId } });
    });
  }

  /** Audit trail for when currentStock looks wrong — see InventoryTransaction. */
  async getStockLedger(partId: string, query: StockLedgerQueryDto) {
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

  private async assertExists(id: string) {
    const part = await this.prisma.forTenant().part.findFirst({ where: { id, deletedAt: null } });
    if (!part) throw new NotFoundException('Part not found');
    return part;
  }
}
