import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { ListPartsQueryDto } from './dto/list-parts-query.dto';
import { StockLedgerQueryDto } from './dto/stock-ledger-query.dto';
import { isLowStock } from './low-stock';

@Injectable()
export class PartsService {
  constructor(private readonly prisma: PrismaService) {}

  // Cast needed because forTenant() injects tenantId into `data` at
  // runtime (see PrismaService) — the generated create type can't see that.
  create(dto: CreatePartDto) {
    return this.prisma.forTenant().part.create({
      data: {
        ...dto,
        gstRate: dto.gstRate ?? 18,
        isActive: dto.isActive ?? true,
      } as unknown as Prisma.PartUncheckedCreateInput,
    });
  }

  async findAll(query: ListPartsQueryDto) {
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
              { partNumber: { contains: query.search, mode: 'insensitive' as const } },
              { sku: { contains: query.search, mode: 'insensitive' as const } },
              { name: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    if (query.lowStock) {
      // Prisma's query builder has no field-to-field comparison operator
      // (currentStock <= minStock references two columns on the same row),
      // so this one filter is applied in application code after fetching
      // every row matching the other filters, then paginated in memory.
      // Low-stock result sets are inherently small — that's the point of
      // the filter — so this stays cheap without DB-level pagination.
      const all = await db.part.findMany({ where, orderBy: { name: 'asc' } });
      const lowStockItems = all.filter(isLowStock);
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

  async findOne(id: string) {
    const part = await this.prisma.forTenant().part.findFirst({ where: { id, deletedAt: null } });
    if (!part) throw new NotFoundException('Part not found');
    return part;
  }

  async update(id: string, dto: UpdatePartDto) {
    await this.assertExists(id);
    return this.prisma.forTenant().part.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.assertExists(id);
    return this.prisma.forTenant().part.update({
      where: { id },
      data: { deletedAt: new Date() },
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
