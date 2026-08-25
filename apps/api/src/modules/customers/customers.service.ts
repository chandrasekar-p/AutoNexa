import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../prisma/tenant-context';
import { computeInvoiceOutstanding, sumOutstanding } from '../../common/billing/outstanding';
import { generateSequenceNumber } from '../../common/sequence/generate-sequence-number';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';

const LIST_INCLUDE = {
  _count: { select: { vehicles: true } },
  // Only need the single most recent job card's date, not the job cards
  // themselves — take: 1 keeps this cheap regardless of how many visits
  // a customer has on file.
  jobCards: { orderBy: { createdAt: 'desc' as const }, take: 1, select: { createdAt: true } },
} as const;

function toListRow(customer: Prisma.CustomerGetPayload<{ include: typeof LIST_INCLUDE }>) {
  const { _count, jobCards, ...rest } = customer;
  return {
    ...rest,
    vehicleCount: _count.vehicles,
    lastVisitAt: jobCards[0]?.createdAt ?? null,
  };
}

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    const tenantId = TenantContext.requireTenantId();
    const db = this.prisma.forTenant();
    const tenantSettings = await this.prisma.platform.tenantSettings.findUniqueOrThrow({ where: { tenantId } });

    return db.$transaction(async (tx) => {
      const customerNumber = await generateSequenceNumber(tx as unknown as Prisma.TransactionClient, tenantId, 'CUSTOMER', tenantSettings.customerPrefix);
      // Cast needed because forTenant() injects tenantId into `data` at
      // runtime (see PrismaService) — the generated create type can't see that.
      return tx.customer.create({
        data: { ...dto, customerNumber } as unknown as Prisma.CustomerUncheckedCreateInput,
      });
    });
  }

  async findAll(query: ListCustomersQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const db = this.prisma.forTenant();

    const where = {
      ...this.statusWhere(query.status),
      ...(query.customerType ? { customerType: query.customerType } : {}),
      ...(query.city ? { city: query.city } : {}),
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

    const [rows, total] = await Promise.all([
      db.customer.findMany({
        where,
        include: LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.customer.count({ where }),
    ]);

    return { items: rows.map(toListRow), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /**
   * KPI cards for the Customers page — total, individual/business split,
   * distinct city count, and total vehicles across the tenant (a plain
   * count on Vehicle, not summed from customer rows, so it matches the
   * Vehicles module's own count exactly). Only ever counts ACTIVE
   * (non-deleted) customers — an inactive customer's historical vehicles
   * still count, since the vehicle itself wasn't deleted.
   */
  async summary() {
    const db = this.prisma.forTenant();
    const [total, individual, business, cities, totalVehicles] = await Promise.all([
      db.customer.count({ where: { deletedAt: null } }),
      db.customer.count({ where: { deletedAt: null, customerType: 'individual' } }),
      db.customer.count({ where: { deletedAt: null, customerType: 'business' } }),
      db.customer.findMany({ where: { deletedAt: null, city: { not: null } }, select: { city: true }, distinct: ['city'] }),
      db.vehicle.count({ where: { deletedAt: null } }),
    ]);

    return {
      total,
      individual,
      business,
      cities: cities.map((c) => c.city as string).sort(),
      totalVehicles,
    };
  }

  /** 'active' (default) = not soft-deleted, matching every existing caller's expectation that GET /customers only ever showed active rows; 'inactive' = soft-deleted only; 'all' = both. */
  private statusWhere(status: 'active' | 'inactive' | 'all' | undefined): Record<string, unknown> {
    if (status === 'inactive') return { deletedAt: { not: null } };
    if (status === 'all') return {};
    return { deletedAt: null };
  }

  /**
   * Full customer profile — vehicles, plus invoices with a computed
   * `outstanding` (grandTotal - sum of payments) per invoice, plus a
   * `totalOutstanding` across their UNPAID/PARTIALLY_PAID invoices. Closes
   * the TODO left here since Phase 3, now that Invoicing/Payments exist.
   */
  async findOne(id: string) {
    const customer = await this.prisma.forTenant().customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        vehicles: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
        invoices: {
          include: { payments: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const invoicesWithOutstanding = customer.invoices.map((invoice) => ({
      ...invoice,
      outstanding: computeInvoiceOutstanding(invoice),
    }));

    const totalOutstanding = sumOutstanding(invoicesWithOutstanding);

    return { ...customer, invoices: invoicesWithOutstanding, totalOutstanding };
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
