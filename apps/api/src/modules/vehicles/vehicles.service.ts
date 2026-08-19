import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { ListVehiclesQueryDto } from './dto/list-vehicles-query.dto';
import { AddVehicleDocumentDto } from './dto/add-vehicle-document.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  // Casts below are needed because forTenant() injects tenantId into `data`
  // at runtime (see PrismaService) — the generated create types can't see that.
  async create(dto: CreateVehicleDto) {
    await this.assertCustomerExists(dto.customerId);
    return this.prisma.forTenant().vehicle.create({
      data: dto as unknown as Prisma.VehicleUncheckedCreateInput,
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

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
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
    return vehicle;
  }

  /**
   * Full service history timeline (Phase 1, Section 19). Placeholder for
   * now — populated from Inspections/Estimates/Job Cards/Invoices once
   * those modules land in Phases 4–7. Returning the shape early so the
   * frontend's vehicle-profile screen has a stable contract to build
   * against from day one.
   */
  async getServiceHistory(id: string) {
    await this.findOne(id);
    return {
      vehicleId: id,
      timeline: [] as Array<{
        date: string;
        type: 'inspection' | 'estimate' | 'job-card' | 'invoice';
        refId: string;
        description: string;
        amount?: number;
      }>,
    };
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.assertExists(id);
    return this.prisma.forTenant().vehicle.update({ where: { id }, data: dto });
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
