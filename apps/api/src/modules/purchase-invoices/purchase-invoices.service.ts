import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PurchaseInvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { rollupPaymentStatus } from '../../common/billing/rollup-payment-status';
import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { UpdatePurchaseInvoiceDto } from './dto/update-purchase-invoice.dto';
import { ListPurchaseInvoicesQueryDto } from './dto/list-purchase-invoices-query.dto';

const PURCHASE_INVOICE_STATUSES = {
  unpaid: PurchaseInvoiceStatus.UNPAID,
  partiallyPaid: PurchaseInvoiceStatus.PARTIALLY_PAID,
  paid: PurchaseInvoiceStatus.PAID,
};

@Injectable()
export class PurchaseInvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  // Cast needed because forTenant() injects tenantId into `data` at
  // runtime (see PrismaService) — the generated create type can't see that.
  async create(dto: CreatePurchaseInvoiceDto) {
    await this.assertPurchaseOrderExists(dto.purchaseOrderId);
    return this.prisma.forTenant().purchaseInvoice.create({
      data: {
        purchaseOrderId: dto.purchaseOrderId,
        supplierInvoiceNumber: dto.supplierInvoiceNumber,
        invoiceDate: new Date(dto.invoiceDate),
        subtotal: dto.subtotal,
        taxAmount: dto.taxAmount,
        total: dto.total,
        status: PurchaseInvoiceStatus.UNPAID,
      } as unknown as Prisma.PurchaseInvoiceUncheckedCreateInput,
    });
  }

  async findAll(query: ListPurchaseInvoicesQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const db = this.prisma.forTenant();

    const where = {
      ...(query.purchaseOrderId ? { purchaseOrderId: query.purchaseOrderId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { supplierInvoiceNumber: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [items, total] = await Promise.all([
      // include: payments — every consumer (this list is always fetched in
      // the context of one purchase order, to show payment status/history
      // per invoice) reads invoice.payments; findOne() already included it,
      // this list endpoint just hadn't been updated to match.
      db.purchaseInvoice.findMany({
        where,
        include: { payments: { orderBy: { paymentDate: 'desc' } } },
        orderBy: { invoiceDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.purchaseInvoice.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string) {
    const invoice = await this.prisma.forTenant().purchaseInvoice.findFirst({
      where: { id },
      include: { payments: { orderBy: { paymentDate: 'desc' } } },
    });
    if (!invoice) throw new NotFoundException('Purchase invoice not found');
    return invoice;
  }

  async update(id: string, dto: UpdatePurchaseInvoiceDto) {
    await this.assertExists(id);
    await this.prisma.forTenant().purchaseInvoice.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.invoiceDate ? { invoiceDate: new Date(dto.invoiceDate) } : {}),
      },
    });
    // Financial fields may have changed (e.g. total corrected) — recompute
    // unconditionally so status never drifts from what's actually owed.
    return this.recalculateStatus(id);
  }

  /** Called after every payment recorded against this invoice (see SupplierPaymentsService). */
  async recalculateStatus(id: string) {
    const db = this.prisma.forTenant();
    const [invoice, payments] = await Promise.all([
      db.purchaseInvoice.findFirstOrThrow({ where: { id } }),
      db.supplierPayment.findMany({ where: { purchaseInvoiceId: id } }),
    ]);

    const totalPaid = payments.reduce((sum, p) => sum.add(p.amount), new Prisma.Decimal(0));
    const status = rollupPaymentStatus(totalPaid, invoice.total, PURCHASE_INVOICE_STATUSES);

    return db.purchaseInvoice.update({
      where: { id },
      data: { status },
      include: { payments: { orderBy: { paymentDate: 'desc' } } },
    });
  }

  private async assertExists(id: string) {
    const invoice = await this.prisma.forTenant().purchaseInvoice.findFirst({ where: { id } });
    if (!invoice) throw new NotFoundException('Purchase invoice not found');
    return invoice;
  }

  private async assertPurchaseOrderExists(purchaseOrderId: string) {
    const po = await this.prisma.forTenant().purchaseOrder.findFirst({ where: { id: purchaseOrderId } });
    if (!po) throw new NotFoundException('Purchase order not found for this invoice');
  }
}
