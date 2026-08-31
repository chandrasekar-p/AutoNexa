import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
      ...(query.validityMonths !== undefined ? { validityMonths: query.validityMonths } : {}),
      ...(query.visitLimit !== undefined
        ? { visitLimit: query.visitLimit === 'unlimited' ? null : Number(query.visitLimit) }
        : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? {
            price: {
              ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
              ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
            },
          }
        : {}),
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

  /**
   * Total/Active/Inactive counts, average price, the distinct
   * validity/visit-limit values actually on file (for the list page's
   * filter dropdowns, same "load once, derive distinct list" pattern as
   * PartsService.summary()'s `brands`), and the single best-selling
   * package (by count of CustomerServicePackage rows) — null, not a
   * fabricated entry, when nothing has ever sold.
   */
  async summary() {
    const db = this.prisma.forTenant();
    const [total, active, inactive, packages, soldGrouped] = await Promise.all([
      db.servicePackage.count({ where: { deletedAt: null } }),
      db.servicePackage.count({ where: { deletedAt: null, isActive: true } }),
      db.servicePackage.count({ where: { deletedAt: null, isActive: false } }),
      db.servicePackage.findMany({ where: { deletedAt: null }, select: { price: true, validityMonths: true, visitLimit: true } }),
      db.customerServicePackage.groupBy({ by: ['servicePackageId'], _count: { _all: true } }),
    ]);

    const avgPrice =
      packages.length > 0
        ? packages.reduce((sum, p) => sum.add(p.price), new Prisma.Decimal(0)).div(packages.length).toDecimalPlaces(2)
        : new Prisma.Decimal(0);
    const validityOptions = Array.from(new Set(packages.map((p) => p.validityMonths))).sort((a, b) => a - b);
    const visitLimitOptions = Array.from(
      new Set(packages.map((p) => p.visitLimit).filter((v): v is number => v != null)),
    ).sort((a, b) => a - b);

    let mostPopular: { id: string; name: string; soldCount: number } | null = null;
    if (soldGrouped.length > 0) {
      const top = soldGrouped.reduce((max, g) => (g._count._all > max._count._all ? g : max), soldGrouped[0]);
      const pkg = await db.servicePackage.findFirst({ where: { id: top.servicePackageId }, select: { id: true, name: true } });
      if (pkg) mostPopular = { id: pkg.id, name: pkg.name, soldCount: top._count._all };
    }

    return {
      total,
      active,
      inactive,
      avgPrice: avgPrice.toString(),
      validityOptions,
      visitLimitOptions,
      mostPopular,
    };
  }

  async findOne(id: string) {
    const pkg = await this.prisma.forTenant().servicePackage.findFirst({
      where: { id, deletedAt: null },
      include: PACKAGE_INCLUDE,
    });
    if (!pkg) throw new NotFoundException('Service package not found');

    const db = this.prisma.forTenant();
    const [soldCount, activeSoldCount, soldInvoices] = await Promise.all([
      db.customerServicePackage.count({ where: { servicePackageId: id } }),
      db.customerServicePackage.count({ where: { servicePackageId: id, status: 'ACTIVE' } }),
      db.customerServicePackage.findMany({ where: { servicePackageId: id }, select: { purchaseInvoice: { select: { grandTotal: true } } } }),
    ]);
    // Sum of each sold instance's actual invoiced amount, not the
    // template's current price — a later price edit must not
    // retroactively change historical revenue, same snapshot-pricing
    // discipline as every other line item in this codebase.
    const totalRevenue = soldInvoices
      .reduce((sum, s) => sum.add(s.purchaseInvoice.grandTotal), new Prisma.Decimal(0))
      .toDecimalPlaces(2);

    return { ...pkg, stats: { soldCount, activeSoldCount, totalRevenue: totalRevenue.toString() } };
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

  /**
   * A package template sold to any customer is never deleted — deactivate
   * it instead. Deleting one anyway would 404 it out of
   * GET /service-packages/:id (findOne filters deletedAt: null) while its
   * sold CustomerServicePackage rows still hold a live servicePackageId FK,
   * same reasoning as SuppliersService.remove()'s identical guard.
   */
  async remove(id: string) {
    await this.assertExists(id);
    const soldCount = await this.prisma.forTenant().customerServicePackage.count({ where: { servicePackageId: id } });
    if (soldCount > 0) {
      throw new ConflictException('This package has been sold to customers — deactivate it instead of deleting.');
    }
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
