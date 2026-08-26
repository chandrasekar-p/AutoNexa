import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InspectionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { STORAGE_SERVICE, StorageService } from '../storage/storage.types';
import { resolveDisplayUrl } from '../storage/resolve-display-url';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { ListInspectionsQueryDto } from './dto/list-inspections-query.dto';
import { CreateInspectionItemDto } from './dto/create-inspection-item.dto';
import { UpdateInspectionItemDto } from './dto/update-inspection-item.dto';
import { AddInspectionPhotoDto } from './dto/add-inspection-photo.dto';
import { DEFAULT_INSPECTION_CHECKLIST } from './default-inspection-checklist';
import { computeInspectionDisplayStatus, computeInspectionDurationMinutes, inspectionDisplayStatusWhere } from './inspection-display-status';

const INSPECTION_INCLUDE = { items: true, photos: { orderBy: { uploadedAt: 'desc' as const } } };

const VEHICLE_SUMMARY_SELECT = {
  id: true,
  registrationNo: true,
  brand: true,
  model: true,
  customer: { select: { id: true, name: true, mobile: true } },
} as const;

// Just enough per item to derive displayStatus (see inspection-display-status.ts) — the list rows don't need remarks/category.
const LIST_INCLUDE = { vehicle: { select: VEHICLE_SUMMARY_SELECT }, items: { select: { result: true } } };

@Injectable()
export class InspectionsService {
  private readonly logger = new Logger(InspectionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

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

    const where: Prisma.InspectionWhereInput = {
      deletedAt: null,
      ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
      ...(query.status ? inspectionDisplayStatusWhere(query.status) : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { notes: { contains: query.search, mode: 'insensitive' as const } },
              { vehicle: { registrationNo: { contains: query.search, mode: 'insensitive' as const } } },
              { vehicle: { customer: { name: { contains: query.search, mode: 'insensitive' as const } } } },
              { vehicle: { customer: { mobile: { contains: query.search } } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.inspection.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.inspection.count({ where }),
    ]);

    return {
      items: items.map((inspection) => this.toListRow(inspection)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  private toListRow(inspection: Prisma.InspectionGetPayload<{ include: typeof LIST_INCLUDE }>) {
    const { items, ...rest } = inspection;
    return {
      ...rest,
      displayStatus: computeInspectionDisplayStatus(inspection),
      durationMinutes: computeInspectionDurationMinutes(inspection.createdAt, inspection.completedAt),
    };
  }

  /** KPI cards for the Inspections page. */
  async summary() {
    const db = this.prisma.forTenant();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [inProgress, completedThisMonth, pendingReview, overdue] = await Promise.all([
      db.inspection.count({ where: { ...inspectionDisplayStatusWhere('IN_PROGRESS', now), deletedAt: null } }),
      db.inspection.count({
        where: { status: InspectionStatus.COMPLETED, completedAt: { gte: monthStart, lt: monthEnd }, deletedAt: null },
      }),
      db.inspection.count({ where: { ...inspectionDisplayStatusWhere('PENDING_REVIEW', now), deletedAt: null } }),
      db.inspection.count({ where: { ...inspectionDisplayStatusWhere('OVERDUE', now), deletedAt: null } }),
    ]);

    return { inProgress, completedThisMonth, pendingReview, overdue };
  }

  async findOne(id: string) {
    const inspection = await this.prisma.forTenant().inspection.findFirst({
      where: { id, deletedAt: null },
      include: INSPECTION_INCLUDE,
    });
    if (!inspection) throw new NotFoundException('Inspection not found');

    const photos = await Promise.all(
      inspection.photos.map(async (photo) => ({ ...photo, fileUrl: (await resolveDisplayUrl(this.storage, photo.fileUrl))! })),
    );
    return {
      ...inspection,
      photos,
      displayStatus: computeInspectionDisplayStatus(inspection),
      durationMinutes: computeInspectionDurationMinutes(inspection.createdAt, inspection.completedAt),
    };
  }

  async update(id: string, dto: UpdateInspectionDto) {
    const existing = await this.assertExists(id);

    // completedAt is frozen at the moment status first becomes COMPLETED,
    // and cleared if the inspection is reopened — see the field's doc
    // comment on the Inspection model.
    let completedAt: Date | null | undefined;
    if (dto.status === InspectionStatus.COMPLETED && existing.status !== InspectionStatus.COMPLETED) {
      completedAt = new Date();
    } else if (dto.status === InspectionStatus.IN_PROGRESS && existing.status !== InspectionStatus.IN_PROGRESS) {
      completedAt = null;
    }

    await this.prisma.forTenant().inspection.update({
      where: { id },
      data: { ...dto, ...(completedAt !== undefined ? { completedAt } : {}) },
    });
    return this.findOne(id);
  }

  /** Soft delete — see the Inspection model's deletedAt doc comment on why this isn't a hard DELETE. */
  async remove(id: string) {
    await this.assertExists(id);
    return this.prisma.forTenant().inspection.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async addItem(inspectionId: string, dto: CreateInspectionItemDto) {
    await this.assertExists(inspectionId);
    await this.prisma.forTenant().inspectionItem.create({
      data: { inspectionId, ...dto } as unknown as Prisma.InspectionItemUncheckedCreateInput,
    });
    return this.findOne(inspectionId);
  }

  async updateItem(inspectionId: string, itemId: string, dto: UpdateInspectionItemDto) {
    await this.assertExists(inspectionId);
    await this.assertItemExists(inspectionId, itemId);
    await this.prisma.forTenant().inspectionItem.update({ where: { id: itemId }, data: dto });
    return this.findOne(inspectionId);
  }

  // Hard delete, unlike most other tenant-owned records — InspectionItem
  // has no downstream financial/audit dependency (nothing references it by
  // id the way an InvoiceLineItem or JobCardPart does), so there's nothing
  // a soft-delete would need to preserve.
  async removeItem(inspectionId: string, itemId: string) {
    await this.assertExists(inspectionId);
    await this.assertItemExists(inspectionId, itemId);
    await this.prisma.forTenant().inspectionItem.delete({ where: { id: itemId } });
    return this.findOne(inspectionId);
  }

  async addPhoto(inspectionId: string, dto: AddInspectionPhotoDto) {
    await this.assertExists(inspectionId);
    await this.prisma.forTenant().inspectionPhoto.create({
      data: { inspectionId, ...dto } as unknown as Prisma.InspectionPhotoUncheckedCreateInput,
    });
    return this.findOne(inspectionId);
  }

  /** Unreferences a wrongly-uploaded photo from the inspection — deletes both the InspectionPhoto row and the underlying stored object (best-effort; see StorageService.delete's doc comment). */
  async removePhoto(inspectionId: string, photoId: string) {
    await this.assertExists(inspectionId);
    const photo = await this.assertPhotoExists(inspectionId, photoId);
    await this.prisma.forTenant().inspectionPhoto.delete({ where: { id: photoId } });
    try {
      await this.storage.delete(photo.fileUrl);
    } catch (err) {
      // The row is already gone — an orphaned object left behind is a
      // storage-cost issue, not a correctness one, so this must not fail
      // the request the way an unhandled rejection would.
      this.logger.warn(`Failed to delete storage object for inspection photo ${photoId}: ${err instanceof Error ? err.message : err}`);
    }
    return this.findOne(inspectionId);
  }

  private async assertExists(id: string) {
    const inspection = await this.prisma.forTenant().inspection.findFirst({ where: { id, deletedAt: null } });
    if (!inspection) throw new NotFoundException('Inspection not found');
    return inspection;
  }

  private async assertItemExists(inspectionId: string, itemId: string) {
    const item = await this.prisma.forTenant().inspectionItem.findFirst({ where: { id: itemId, inspectionId } });
    if (!item) throw new NotFoundException('Inspection item not found');
    return item;
  }

  private async assertPhotoExists(inspectionId: string, photoId: string) {
    const photo = await this.prisma.forTenant().inspectionPhoto.findFirst({ where: { id: photoId, inspectionId } });
    if (!photo) throw new NotFoundException('Inspection photo not found');
    return photo;
  }

  private async assertVehicleExists(vehicleId: string) {
    const vehicle = await this.prisma.forTenant().vehicle.findFirst({ where: { id: vehicleId, deletedAt: null } });
    if (!vehicle) throw new NotFoundException('Vehicle not found for this inspection');
  }
}
