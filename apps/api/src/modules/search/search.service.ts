import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

const RESULTS_PER_CATEGORY = 5;

function canRead(user: AuthenticatedUser, resource: string): boolean {
  return user.isSuperAdmin || user.permissions.includes(`${resource}:read`);
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * SRS §24: one search box across customer, vehicle, job-card, invoice and
   * part. This is a REAL permission boundary, not the frontend's UX-only
   * nav-hiding convention (lib/hooks/use-permission.ts on the web side) —
   * a Technician (no invoice:read) must never see invoice numbers surface
   * here just because they typed a matching string, so each category is
   * skipped server-side unless the caller actually holds that resource's
   * `:read` permission.
   */
  async search(user: AuthenticatedUser, q: string) {
    const db = this.prisma.forTenant();
    const contains = { contains: q, mode: 'insensitive' as const };

    const [customers, vehicles, jobCards, invoices, parts] = await Promise.all([
      canRead(user, 'customer')
        ? db.customer.findMany({
            where: { deletedAt: null, OR: [{ name: contains }, { mobile: contains }, { email: contains }] },
            select: { id: true, name: true, mobile: true },
            take: RESULTS_PER_CATEGORY,
          })
        : [],
      canRead(user, 'vehicle')
        ? db.vehicle.findMany({
            where: { deletedAt: null, OR: [{ registrationNo: contains }, { vin: contains }] },
            select: { id: true, registrationNo: true, brand: true, model: true },
            take: RESULTS_PER_CATEGORY,
          })
        : [],
      canRead(user, 'job-card')
        ? db.jobCard.findMany({
            where: { deletedAt: null, jobCardNumber: contains },
            select: { id: true, jobCardNumber: true, status: true },
            take: RESULTS_PER_CATEGORY,
          })
        : [],
      canRead(user, 'invoice')
        ? db.invoice.findMany({
            where: { invoiceNumber: contains },
            select: { id: true, invoiceNumber: true, status: true, grandTotal: true },
            take: RESULTS_PER_CATEGORY,
          })
        : [],
      canRead(user, 'part')
        ? db.part.findMany({
            where: { deletedAt: null, OR: [{ partNumber: contains }, { sku: contains }, { name: contains }] },
            select: { id: true, partNumber: true, sku: true, name: true },
            take: RESULTS_PER_CATEGORY,
          })
        : [],
    ]);

    return { customers, vehicles, jobCards, invoices, parts };
  }
}
