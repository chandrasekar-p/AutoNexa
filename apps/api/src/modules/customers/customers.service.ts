import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  // Cast needed because forTenant() injects tenantId into `data` at
  // runtime (see PrismaService) — the generated create type can't see that.
  create(dto: CreateCustomerDto) {
    return this.prisma.forTenant().customer.create({
      data: dto as unknown as Prisma.CustomerUncheckedCreateInput,
    });
  }

  async findAll(query: ListCustomersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const db = this.prisma.forTenant();

    const where = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { mobile: { contains: query.search } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.customer.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /**
   * Full customer profile — vehicles now; invoices, payments, estimates,
   * job cards, and outstanding balance are added here as those modules
   * land in Phases 4–7 (each just extends this `include`/response shape,
   * per the Phase 1 architecture's customer-profile spec).
   */
  async findOne(id: string) {
    const customer = await this.prisma.forTenant().customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        vehicles: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.assertExists(id);
    return this.prisma.forTenant().customer.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.assertExists(id);
    return this.prisma.forTenant().customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async assertExists(id: string) {
    const customer = await this.prisma.forTenant().customer.findFirst({ where: { id, deletedAt: null } });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }
}
