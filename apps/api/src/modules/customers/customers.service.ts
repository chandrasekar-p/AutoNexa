import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, Prisma } from '@prisma/client';
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

    const invoicesWithOutstanding = customer.invoices.map((invoice) => {
      const paid = invoice.payments.reduce((sum, p) => sum.add(p.amount), new Prisma.Decimal(0));
      const outstanding = new Prisma.Decimal(invoice.grandTotal).sub(paid).toDecimalPlaces(2);
      return { ...invoice, outstanding };
    });

    const totalOutstanding = invoicesWithOutstanding
      .filter((inv) => inv.status === InvoiceStatus.UNPAID || inv.status === InvoiceStatus.PARTIALLY_PAID)
      .reduce((sum, inv) => sum.add(inv.outstanding), new Prisma.Decimal(0));

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
