import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateServicePackageDto } from './dto/create-service-package.dto';
import { UpdateServicePackageDto } from './dto/update-service-package.dto';
import { ListServicePackagesQueryDto } from './dto/list-service-packages-query.dto';

const PACKAGE_INCLUDE = {
  includedLabourItems: { include: { labourItem: { select: { id: true, code: true, description: true } } } },
  includedParts: { include: { part: { select: { id: true, partNumber: true, name: true } } } },
  includedPartCategories: { include: { partCategory: { select: { id: true, name: true } } } },
} as const;

@Injectable()
export class ServicePackagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateServicePackageDto) {
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
      } as unknown as Prisma.ServicePackageUncheckedCreateInput,
    });

    await this.replaceInclusions(created.id, dto);
    return this.findOne(created.id);
  }

  async findAll(query: ListServicePackagesQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const db = this.prisma.forTenant();

    const where = {
      deletedAt: null,
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { description: { contains: query.search, mode: 'insensitive' as const } },
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

  async findOne(id: string) {
    const pkg = await this.prisma.forTenant().servicePackage.findFirst({
      where: { id, deletedAt: null },
      include: PACKAGE_INCLUDE,
    });
    if (!pkg) throw new NotFoundException('Service package not found');
    return pkg;
  }

  async update(id: string, dto: UpdateServicePackageDto) {
    await this.assertExists(id);
    const { labourItemIds, partIds, partCategoryIds, ...fields } = dto;
    await this.prisma.forTenant().servicePackage.update({ where: { id }, data: fields });

    // Inclusion arrays, if present in the payload, replace the current
    // list wholesale — see UpdateServicePackageDto's doc comment.
    if (labourItemIds !== undefined || partIds !== undefined || partCategoryIds !== undefined) {
      await this.replaceInclusions(id, dto);
    }
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.assertExists(id);
    return this.prisma.forTenant().servicePackage.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }

  private async replaceInclusions(servicePackageId: string, dto: CreateServicePackageDto | UpdateServicePackageDto) {
    const db = this.prisma.forTenant();
    if (dto.labourItemIds !== undefined) {
      await db.servicePackageLabourItem.deleteMany({ where: { servicePackageId } });
      if (dto.labourItemIds.length > 0) {
        await db.servicePackageLabourItem.createMany({
          data: dto.labourItemIds.map((labourItemId) => ({ servicePackageId, labourItemId })) as unknown as Prisma.ServicePackageLabourItemCreateManyInput[],
        });
      }
    }
    if (dto.partIds !== undefined) {
      await db.servicePackagePart.deleteMany({ where: { servicePackageId } });
      if (dto.partIds.length > 0) {
        await db.servicePackagePart.createMany({
          data: dto.partIds.map((partId) => ({ servicePackageId, partId })) as unknown as Prisma.ServicePackagePartCreateManyInput[],
        });
      }
    }
    if (dto.partCategoryIds !== undefined) {
      await db.servicePackagePartCategory.deleteMany({ where: { servicePackageId } });
      if (dto.partCategoryIds.length > 0) {
        await db.servicePackagePartCategory.createMany({
          data: dto.partCategoryIds.map((partCategoryId) => ({ servicePackageId, partCategoryId })) as unknown as Prisma.ServicePackagePartCategoryCreateManyInput[],
        });
      }
    }
  }

  private async assertExists(id: string) {
    const pkg = await this.prisma.forTenant().servicePackage.findFirst({ where: { id, deletedAt: null } });
    if (!pkg) throw new NotFoundException('Service package not found');
    return pkg;
  }
}
