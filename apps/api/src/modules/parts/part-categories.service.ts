import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePartCategoryDto } from './dto/create-part-category.dto';
import { UpdatePartCategoryDto } from './dto/update-part-category.dto';

@Injectable()
export class PartCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // Cast needed because forTenant() injects tenantId into `data` at
  // runtime (see PrismaService) — the generated create type can't see that.
  create(dto: CreatePartCategoryDto) {
    return this.prisma.forTenant().partCategory.create({
      data: dto as unknown as Prisma.PartCategoryUncheckedCreateInput,
    });
  }

  findAll() {
    return this.prisma.forTenant().partCategory.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, dto: UpdatePartCategoryDto) {
    await this.assertExists(id);
    return this.prisma.forTenant().partCategory.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.assertExists(id);
    return this.prisma.forTenant().partCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async assertExists(id: string) {
    const category = await this.prisma.forTenant().partCategory.findFirst({ where: { id, deletedAt: null } });
    if (!category) throw new NotFoundException('Part category not found');
    return category;
  }
}
