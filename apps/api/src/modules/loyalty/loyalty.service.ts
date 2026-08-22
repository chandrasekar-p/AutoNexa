import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { adjustLoyaltyBalance } from './loyalty-ledger';
import { AdjustLoyaltyPointsDto } from './dto/adjust-loyalty-points.dto';
import { ListLoyaltyTransactionsQueryDto } from './dto/list-loyalty-transactions-query.dto';

@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(customerId: string) {
    const customer = await this.prisma.forTenant().customer.findFirst({
      where: { id: customerId, deletedAt: null },
      select: { id: true, name: true, loyaltyPointsBalance: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return { customerId: customer.id, customerName: customer.name, balance: customer.loyaltyPointsBalance };
  }

  async listTransactions(query: ListLoyaltyTransactionsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const db = this.prisma.forTenant();

    const where = { ...(query.customerId ? { customerId: query.customerId } : {}) };

    const [items, total] = await Promise.all([
      db.loyaltyTransaction.findMany({
        where,
        include: { customer: { select: { id: true, name: true } }, adjustedByUser: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.loyaltyTransaction.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /** Manual correction — goodwill points, fixing an error, etc. `dto.points` may be positive or negative; a negative adjustment is guarded exactly like a redemption (see adjustLoyaltyBalance). */
  async adjust(dto: AdjustLoyaltyPointsDto, adjustedByUserId: string) {
    const db = this.prisma.forTenant();
    const customer = await db.customer.findFirst({ where: { id: dto.customerId, deletedAt: null } });
    if (!customer) throw new NotFoundException('Customer not found');

    await db.$transaction(async (tx) => {
      await adjustLoyaltyBalance(tx as unknown as Prisma.TransactionClient, dto.customerId, dto.points, {
        invoiceId: null,
        type: 'ADJUSTED',
        note: dto.note,
        adjustedByUserId,
      });
    });

    return this.getBalance(dto.customerId);
  }
}
