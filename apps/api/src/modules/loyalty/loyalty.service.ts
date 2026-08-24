import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../prisma/tenant-context';
import { MessagingService } from '../messaging/messaging.service';
import { loyaltyAdjustmentMessage } from '../messaging/templates';
import { adjustLoyaltyBalance } from './loyalty-ledger';
import { AdjustLoyaltyPointsDto } from './dto/adjust-loyalty-points.dto';
import { ListLoyaltyTransactionsQueryDto } from './dto/list-loyalty-transactions-query.dto';

@Injectable()
export class LoyaltyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messaging: MessagingService,
  ) {}

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

    const transaction = await db.$transaction(async (tx) => {
      return adjustLoyaltyBalance(tx as unknown as Prisma.TransactionClient, dto.customerId, dto.points, {
        invoiceId: null,
        type: 'ADJUSTED',
        note: dto.note,
        adjustedByUserId,
      });
    });

    await this.sendAdjustmentNotification(customer, transaction);

    const balance = await this.getBalance(dto.customerId);
    return { id: transaction.id, ...balance };
  }

  /** Best-effort — see MessagingService.notifyCustomer's doc comment on why this never throws. */
  private async sendAdjustmentNotification(
    customer: Prisma.CustomerGetPayload<Record<string, never>>,
    transaction: Prisma.LoyaltyTransactionGetPayload<Record<string, never>>,
  ): Promise<void> {
    const tenantId = TenantContext.requireTenantId();
    const tenant = await this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    const content = loyaltyAdjustmentMessage({
      workshopName: tenant?.name ?? 'AutoNexa',
      customerName: customer.name,
      points: transaction.points,
      balance: String(transaction.balanceAfter),
    });
    await this.messaging.notifyCustomer(
      tenantId,
      'loyalty.adjusted',
      { email: customer.email, mobile: customer.mobile },
      content,
      { type: 'Customer', id: customer.id },
    );
  }
}
