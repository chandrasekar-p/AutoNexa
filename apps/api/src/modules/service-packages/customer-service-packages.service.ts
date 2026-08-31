import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CustomerPackageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext } from '../../prisma/tenant-context';
import { InvoicesService } from '../invoices/invoices.service';
import { MessagingService } from '../messaging/messaging.service';
import { packageCancelledMessage } from '../messaging/templates';
import { SellServicePackageDto } from './dto/sell-service-package.dto';
import { ListCustomerServicePackagesQueryDto } from './dto/list-customer-service-packages-query.dto';

const CUSTOMER_PACKAGE_INCLUDE = {
  servicePackage: true,
  customer: { select: { id: true, name: true, mobile: true, email: true, state: true } },
  vehicle: { select: { id: true, registrationNo: true, brand: true, model: true } },
  purchaseInvoice: { select: { id: true, invoiceNumber: true, grandTotal: true, status: true } },
} as const;

@Injectable()
export class CustomerServicePackagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoicesService: InvoicesService,
    private readonly messaging: MessagingService,
  ) {}

  /**
   * Sells a package template to a specific customer+vehicle — creates the
   * CustomerServicePackage AND its paying Invoice atomically in one
   * transaction (never a phantom invoice with no package, or vice versa).
   * The invoice is a single synthetic line item at the template's
   * snapshotted price/GST; `jobCardId: null` since this isn't a repair,
   * same "nullable for non-job-card invoicing" affordance Invoice has had
   * since Phase 7.
   */
  async sell(dto: SellServicePackageDto) {
    const tenantId = TenantContext.requireTenantId();
    const db = this.prisma.forTenant();

    const [servicePackage, customer, vehicle, tenantSettings] = await Promise.all([
      db.servicePackage.findFirst({ where: { id: dto.servicePackageId, deletedAt: null, isActive: true } }),
      db.customer.findFirstOrThrow({ where: { id: dto.customerId, deletedAt: null } }),
      db.vehicle.findFirstOrThrow({ where: { id: dto.vehicleId, deletedAt: null } }),
      db.tenantSettings.findUniqueOrThrow({ where: { tenantId } }),
    ]);
    if (!servicePackage) throw new NotFoundException('Service package not found or no longer offered');
    if (vehicle.customerId !== customer.id) throw new BadRequestException('This vehicle does not belong to this customer');

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + servicePackage.validityMonths);

    const result = await db.$transaction(async (tx) => {
      const invoice = await this.invoicesService.createInvoiceInTransaction(tx as unknown as Prisma.TransactionClient, {
        tenantId,
        tenantSettings,
        customerId: customer.id,
        customerState: customer.state,
        jobCardId: null,
        lineItemInputs: [
          {
            description: servicePackage.name,
            quantity: new Prisma.Decimal(1),
            unitPrice: servicePackage.price,
            gstRate: servicePackage.gstRate,
            hsnSac: null,
            lineTotal: servicePackage.price,
          },
        ],
      });

      const customerPackage = await tx.customerServicePackage.create({
        data: {
          servicePackageId: servicePackage.id,
          customerId: customer.id,
          vehicleId: vehicle.id,
          purchaseInvoiceId: invoice.id,
          startDate,
          endDate,
          // SNAPSHOTTED — a later edit to the template's visitLimit must
          // not retroactively change this already-sold package's terms.
          visitLimit: servicePackage.visitLimit,
          status: CustomerPackageStatus.ACTIVE,
        } as unknown as Prisma.CustomerServicePackageUncheckedCreateInput,
      });

      return { invoice, customerPackage };
    });

    await this.invoicesService.sendInvoiceIssued(tenantId, customer, result.invoice.id, result.invoice.invoiceNumber, result.invoice.grandTotal);

    return this.findOne(result.customerPackage.id);
  }

  /**
   * Renews an expiring/expired package — a NEW CustomerServicePackage (new
   * sale, new invoice), linked back via renewedFromId for continuity, not
   * a mutation of the old one. Renewal payment reuses the ordinary invoice
   * flow verbatim: staff clicks "Send Payment Link" on the resulting
   * invoice exactly like any other invoice — no separate Razorpay
   * integration needed for this (see the architecture doc).
   */
  async renew(id: string) {
    const existing = await this.findOne(id);
    if (existing.status === CustomerPackageStatus.CANCELLED) {
      throw new BadRequestException('This package was cancelled — sell a new package instead of renewing it');
    }
    const sold = await this.sell({ servicePackageId: existing.servicePackageId, customerId: existing.customerId, vehicleId: existing.vehicleId });
    await this.prisma.forTenant().customerServicePackage.update({ where: { id: sold.id }, data: { renewedFromId: existing.id } });
    return this.findOne(sold.id);
  }

  async cancel(id: string) {
    const existing = await this.findOne(id);
    if (existing.status !== CustomerPackageStatus.ACTIVE) {
      throw new BadRequestException(`Cannot cancel a package that is already ${existing.status}`);
    }
    const cancelled = await this.prisma.forTenant().customerServicePackage.update({
      where: { id },
      data: { status: CustomerPackageStatus.CANCELLED },
    });
    await this.sendCancelledNotification(existing);
    return cancelled;
  }

  /** Best-effort — see MessagingService.notifyCustomer's doc comment on why this never throws. */
  private async sendCancelledNotification(pkg: Awaited<ReturnType<CustomerServicePackagesService['findOne']>>): Promise<void> {
    const tenantId = TenantContext.requireTenantId();
    const tenant = await this.prisma.platform.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    const content = packageCancelledMessage({
      workshopName: tenant?.name ?? 'AutoNexa',
      customerName: pkg.customer.name,
      packageName: pkg.servicePackage.name,
    });
    await this.messaging.notifyCustomer(
      tenantId,
      'service-package.cancelled',
      { email: pkg.customer.email, mobile: pkg.customer.mobile, customerId: pkg.customer.id },
      content,
      { type: 'CustomerServicePackage', id: pkg.id },
    );
  }

  async findAll(query: ListCustomerServicePackagesQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const db = this.prisma.forTenant();

    const where = {
      ...(query.servicePackageId ? { servicePackageId: query.servicePackageId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await Promise.all([
      db.customerServicePackage.findMany({
        where,
        include: CUSTOMER_PACKAGE_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.customerServicePackage.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string) {
    const pkg = await this.prisma.forTenant().customerServicePackage.findFirst({ where: { id }, include: CUSTOMER_PACKAGE_INCLUDE });
    if (!pkg) throw new NotFoundException('Customer service package not found');
    return pkg;
  }
}
