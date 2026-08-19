import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { ListInspectionsQueryDto } from './dto/list-inspections-query.dto';
import { CreateInspectionItemDto } from './dto/create-inspection-item.dto';
import { UpdateInspectionItemDto } from './dto/update-inspection-item.dto';
import { AddInspectionPhotoDto } from './dto/add-inspection-photo.dto';
import { DEFAULT_INSPECTION_CHECKLIST } from './default-inspection-checklist';

const INSPECTION_INCLUDE = { items: true, photos: { orderBy: { uploadedAt: 'desc' as const } } };

@Injectable()
export class InspectionsService {
  constructor(private readonly prisma: PrismaService) {}

  // Casts below are needed because forTenant() injects tenantId into `data`
  // at runtime (see PrismaService) — the generated create types can't see that.
  async create(dto: CreateInspectionDto) {
    await this.assertVehicleExists(dto.vehicleId);
    const db = this.prisma.forTenant();

    const inspection = await db.inspection.create({
      data: {
        vehicleId: dto.vehicleId,
        appointmentId: dto.appointmentId,
        technicianId: dto.technicianId,
        notes: dto.notes,
      } as unknown as Prisma.InspectionUncheckedCreateInput,
    });

    const defaultItems = Object.entries(DEFAULT_INSPECTION_CHECKLIST).flatMap(([category, itemNames]) =>
      itemNames.map((itemName) => ({ inspectionId: inspection.id, category, itemName })),
    );
    await db.inspectionItem.createMany({
      data: defaultItems as unknown as Prisma.InspectionItemCreateManyInput[],
    });

    return this.findOne(inspection.id);
  }

  async findAll(query: ListInspectionsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const db = this.prisma.forTenant();

    const where = {
      ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { notes: { contains: query.search, mode: 'insensitive' as const } } : {}),
    };

    const [items, total] = await Promise.all([
      db.inspection.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.inspection.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string) {
    const inspection = await this.prisma.forTenant().inspection.findFirst({
      where: { id },
      include: INSPECTION_INCLUDE,
    });
    if (!inspection) throw new NotFoundException('Inspection not found');
    return inspection;
  }

  async update(id: string, dto: UpdateInspectionDto) {
    await this.assertExists(id);
    await this.prisma.forTenant().inspection.update({ where: { id }, data: dto });
    return this.findOne(id);
  }

  async addItem(inspectionId: string, dto: CreateInspectionItemDto) {
    await this.assertExists(inspectionId);
    await this.prisma.forTenant().inspectionItem.create({
      data: { inspectionId, ...dto } as unknown as Prisma.InspectionItemUncheckedCreateInput,
    });
    return this.findOne(inspectionId);
  }

  async updateItem(inspectionId: string, itemId: string, dto: UpdateInspectionItemDto) {
    await this.assertItemExists(inspectionId, itemId);
    await this.prisma.forTenant().inspectionItem.update({ where: { id: itemId }, data: dto });
    return this.findOne(inspectionId);
  }

  async addPhoto(inspectionId: string, dto: AddInspectionPhotoDto) {
    await this.assertExists(inspectionId);
    await this.prisma.forTenant().inspectionPhoto.create({
      data: { inspectionId, ...dto } as unknown as Prisma.InspectionPhotoUncheckedCreateInput,
    });
    return this.findOne(inspectionId);
  }

  private async assertExists(id: string) {
    const inspection = await this.prisma.forTenant().inspection.findFirst({ where: { id } });
    if (!inspection) throw new NotFoundException('Inspection not found');
    return inspection;
  }

  private async assertItemExists(inspectionId: string, itemId: string) {
    const item = await this.prisma.forTenant().inspectionItem.findFirst({ where: { id: itemId, inspectionId } });
    if (!item) throw new NotFoundException('Inspection item not found');
    return item;
  }

  private async assertVehicleExists(vehicleId: string) {
    const vehicle = await this.prisma.forTenant().vehicle.findFirst({ where: { id: vehicleId, deletedAt: null } });
    if (!vehicle) throw new NotFoundException('Vehicle not found for this inspection');
  }
}
