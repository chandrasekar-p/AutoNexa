import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { STORAGE_SERVICE, StorageService } from '../storage/storage.types';
import { resolveDisplayUrl } from '../storage/resolve-display-url';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { ListVehiclesQueryDto } from './dto/list-vehicles-query.dto';
import { AddVehicleDocumentDto } from './dto/add-vehicle-document.dto';
import { computeWarrantyStatus } from '../warranty/warranty-status';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  // Casts below are needed because forTenant() injects tenantId into `data`
  // at runtime (see PrismaService) — the generated create types can't see that.
  async create(dto: CreateVehicleDto) {
    await this.assertCustomerExists(dto.customerId);
    return this.prisma.forTenant().vehicle.create({
      data: {
        ...dto,
        ...(dto.insuranceExpiry ? { insuranceExpiry: new Date(dto.insuranceExpiry) } : {}),
        ...(dto.pucExpiry ? { pucExpiry: new Date(dto.pucExpiry) } : {}),
        ...(dto.purchaseDate ? { purchaseDate: new Date(dto.purchaseDate) } : {}),
      } as unknown as Prisma.VehicleUncheckedCreateInput,
    });
  }

  async findAll(query: ListVehiclesQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const db = this.prisma.forTenant();

    const where = {
      deletedAt: null,
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.search
        ? {
            OR: [
              { registrationNo: { contains: query.search, mode: 'insensitive' as const } },
              { vin: { contains: query.search, mode: 'insensitive' as const } },
              { brand: { contains: query.search, mode: 'insensitive' as const } },
              { model: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.vehicle.findMany({
        where,
        include: { customer: { select: { id: true, name: true, mobile: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.vehicle.count({ where }),
    ]);

    const resolvedItems = await Promise.all(
      items.map(async (vehicle) => ({ ...vehicle, photoUrl: await resolveDisplayUrl(this.storage, vehicle.photoUrl) })),
    );

    return { items: resolvedItems, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.forTenant().vehicle.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: { select: { id: true, name: true, mobile: true, email: true } },
        documents: { orderBy: { uploadedAt: 'desc' } },
      },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const [photoUrl, documents] = await Promise.all([
      resolveDisplayUrl(this.storage, vehicle.photoUrl),
      Promise.all(vehicle.documents.map(async (doc) => ({ ...doc, fileUrl: (await resolveDisplayUrl(this.storage, doc.fileUrl))! }))),
    ]);

    return { ...vehicle, photoUrl, documents };
  }

  /**
   * Full service history timeline (Phase 1, Section 19). Closes the TODO
   * left here since Phase 3 — Inspections/Estimates/Job Cards/Invoices all
   * exist now. Invoices don't carry `vehicleId` directly (they're keyed to
   * a JobCard), so they're pulled via this vehicle's job card ids.
   */
  async getServiceHistory(id: string) {
    await this.assertExists(id);
    const db = this.prisma.forTenant();

    const [inspections, estimates, jobCards] = await Promise.all([
      db.inspection.findMany({ where: { vehicleId: id } }),
      db.estimate.findMany({ where: { vehicleId: id, deletedAt: null } }),
      db.jobCard.findMany({ where: { vehicleId: id, deletedAt: null } }),
    ]);

    const jobCardIds = jobCards.map((jc) => jc.id);
    const invoices = jobCardIds.length
      ? await db.invoice.findMany({ where: { jobCardId: { in: jobCardIds } } })
      : [];

    type TimelineEntry = {
      date: Date;
      type: 'inspection' | 'estimate' | 'job-card' | 'invoice';
      refId: string;
      description: string;
      amount?: number;
    };

    const timeline: TimelineEntry[] = [
      ...inspections.map((i) => ({
        date: i.createdAt,
        type: 'inspection' as const,
        refId: i.id,
        description: `Inspection (${i.status})`,
      })),
      ...estimates.map((e) => ({
        date: e.createdAt,
        type: 'estimate' as const,
        refId: e.id,
        description: e.jobDescription ?? 'Estimate',
        amount: Number(e.total),
      })),
      ...jobCards.map((jc) => ({
        date: jc.createdAt,
        type: 'job-card' as const,
        refId: jc.id,
        description: jc.complaint ?? `Job card ${jc.jobCardNumber}`,
      })),
      ...invoices.map((inv) => ({
        date: inv.createdAt,
        type: 'invoice' as const,
        refId: inv.id,
        description: `Invoice ${inv.invoiceNumber}`,
        amount: Number(inv.grandTotal),
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    return {
      vehicleId: id,
      timeline: timeline.map((entry) => ({ ...entry, date: entry.date.toISOString() })),
    };
  }

  /**
   * Every past labour/part line on this vehicle's delivered job cards,
   * with computed warranty coverage — useful at intake ("is this brake
   * job still covered?") and to a customer self-service page later.
   * `existingClaimId` surfaces whether a WarrantyClaim already exists
   * against that line, so staff don't raise a duplicate.
   */
  async getWarrantyStatus(id: string) {
    const vehicle = await this.assertExists(id);
    const db = this.prisma.forTenant();

    const [labourLines, partLines] = await Promise.all([
      db.jobCardLabour.findMany({
        where: { jobCard: { vehicleId: id, deletedAt: null, actualDelivery: { not: null } } },
        include: {
          labourItem: { select: { description: true } },
          jobCard: { select: { id: true, jobCardNumber: true, actualDelivery: true } },
          originalOfClaims: { select: { id: true }, take: 1 },
        },
      }),
      db.jobCardPart.findMany({
        where: { jobCard: { vehicleId: id, deletedAt: null, actualDelivery: { not: null } } },
        include: {
          part: { select: { name: true, partNumber: true } },
          jobCard: { select: { id: true, jobCardNumber: true, actualDelivery: true, odometer: true } },
          originalOfClaims: { select: { id: true }, take: 1 },
        },
      }),
    ]);

    return {
      labour: labourLines.map((l) => {
        const result = computeWarrantyStatus(l.jobCard.actualDelivery, l.warrantyMonths, null, null, null);
        return {
          jobCardLabourId: l.id,
          jobCardId: l.jobCard.id,
          jobCardNumber: l.jobCard.jobCardNumber,
          description: l.description ?? l.labourItem?.description ?? 'Labour',
          warrantyMonths: l.warrantyMonths,
          expiresAt: result.expiresAt,
          isActive: result.isActive,
          existingClaimId: l.originalOfClaims[0]?.id ?? null,
        };
      }),
      parts: partLines.map((p) => {
        const result = computeWarrantyStatus(p.jobCard.actualDelivery, p.warrantyMonths, p.warrantyKm, p.jobCard.odometer, vehicle.odometerReading);
        return {
          jobCardPartId: p.id,
          jobCardId: p.jobCard.id,
          jobCardNumber: p.jobCard.jobCardNumber,
          partName: `${p.part.partNumber} — ${p.part.name}`,
          warrantyMonths: p.warrantyMonths,
          warrantyKm: p.warrantyKm,
          expiresAt: result.expiresAt,
          expiredByKm: result.expiredByKm,
          isActive: result.isActive,
          existingClaimId: p.originalOfClaims[0]?.id ?? null,
        };
      }),
    };
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.assertExists(id);
    return this.prisma.forTenant().vehicle.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.insuranceExpiry ? { insuranceExpiry: new Date(dto.insuranceExpiry) } : {}),
        ...(dto.pucExpiry ? { pucExpiry: new Date(dto.pucExpiry) } : {}),
        ...(dto.purchaseDate ? { purchaseDate: new Date(dto.purchaseDate) } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.assertExists(id);
    return this.prisma.forTenant().vehicle.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async addDocument(vehicleId: string, dto: AddVehicleDocumentDto) {
    await this.assertExists(vehicleId);
    return this.prisma.forTenant().vehicleDocument.create({
      data: { vehicleId, ...dto } as unknown as Prisma.VehicleDocumentUncheckedCreateInput,
    });
  }

  private async assertExists(id: string) {
    const vehicle = await this.prisma.forTenant().vehicle.findFirst({ where: { id, deletedAt: null } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  private async assertCustomerExists(customerId: string) {
    const customer = await this.prisma.forTenant().customer.findFirst({
      where: { id: customerId, deletedAt: null },
    });
    if (!customer) throw new NotFoundException('Customer not found for this vehicle');
  }
}
