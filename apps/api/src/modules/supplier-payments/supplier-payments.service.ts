import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PurchaseInvoicesService } from '../purchase-invoices/purchase-invoices.service';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { ListSupplierPaymentsQueryDto } from './dto/list-supplier-payments-query.dto';

// No update/delete — SupplierPayment has no updatedAt/deletedAt. Financial
// records are corrected with a new entry, not edited/removed, same as
// InventoryTransaction/JobCardStatusHistory's append-only discipline.
@Injectable()
export class SupplierPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly purchaseInvoicesService: PurchaseInvoicesService,
  ) {}

  // Cast needed because forTenant() injects tenantId into `data` at
  // runtime (see PrismaService) — the generated create type can't see that.
  async create(dto: CreateSupplierPaymentDto) {
    await this.assertInvoiceExists(dto.purchaseInvoiceId);

    const payment = await this.prisma.forTenant().supplierPayment.create({
      data: {
        purchaseInvoiceId: dto.purchaseInvoiceId,
        amount: dto.amount,
        paymentDate: new Date(dto.paymentDate),
        method: dto.method,
        referenceNumber: dto.referenceNumber,
      } as unknown as Prisma.SupplierPaymentUncheckedCreateInput,
    });

    // UNPAID -> PARTIALLY_PAID -> PAID, recomputed from sum-of-payments.
    await this.purchaseInvoicesService.recalculateStatus(dto.purchaseInvoiceId);

    return payment;
  }

  async findAll(query: ListSupplierPaymentsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const db = this.prisma.forTenant();

    const where = {
      ...(query.purchaseInvoiceId ? { purchaseInvoiceId: query.purchaseInvoiceId } : {}),
    };

    const [items, total] = await Promise.all([
      db.supplierPayment.findMany({
        where,
        orderBy: { paymentDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.supplierPayment.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string) {
    const payment = await this.prisma.forTenant().supplierPayment.findFirst({ where: { id } });
    if (!payment) throw new NotFoundException('Supplier payment not found');
    return payment;
  }

  private async assertInvoiceExists(purchaseInvoiceId: string) {
    const invoice = await this.prisma.forTenant().purchaseInvoice.findFirst({
      where: { id: purchaseInvoiceId },
    });
    if (!invoice) throw new NotFoundException('Purchase invoice not found for this payment');
  }
}
