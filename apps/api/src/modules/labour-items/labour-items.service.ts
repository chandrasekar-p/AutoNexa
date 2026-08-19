import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLabourItemDto } from './dto/create-labour-item.dto';
import { UpdateLabourItemDto } from './dto/update-labour-item.dto';
import { ListLabourItemsQueryDto } from './dto/list-labour-items-query.dto';

@Injectable()
export class LabourItemsService {
  constructor(private readonly prisma: PrismaService) {}

  // Cast needed because forTenant() injects tenantId into `data` at
  // runtime (see PrismaService) — the generated create type can't see that.
  create(dto: CreateLabourItemDto) {
    return this.prisma.forTenant().labourItem.create({
      data: {
        ...dto,
        gstRate: dto.gstRate ?? 18,
        isActive: dto.isActive ?? true,
      } as unknown as Prisma.LabourItemUncheckedCreateInput,
    });
  }

  async findAll(query: ListLabourItemsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const db = this.prisma.forTenant();

    const where = {
      deletedAt: null,
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' as const } },
              { description: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.labourItem.findMany({
        where,
        orderBy: { code: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.labourItem.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string) {
    const item = await this.prisma.forTenant().labourItem.findFirst({ where: { id, deletedAt: null } });
    if (!item) throw new NotFoundException('Labour item not found');
    return item;
  }

  async update(id: string, dto: UpdateLabourItemDto) {
    await this.assertExists(id);
    return this.prisma.forTenant().labourItem.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.assertExists(id);
    return this.prisma.forTenant().labourItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async assertExists(id: string) {
    const item = await this.prisma.forTenant().labourItem.findFirst({ where: { id, deletedAt: null } });
    if (!item) throw new NotFoundException('Labour item not found');
    return item;
  }
}
