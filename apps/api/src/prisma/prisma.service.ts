import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContext } from './tenant-context';

/**
 * Every Prisma model that carries a `tenantId` column belongs here.
 * This list is the enforcement point referenced throughout the Phase 1
 * architecture doc: nothing outside this list gets auto-scoped, and
 * everything inside it CANNOT be queried/written without a resolved
 * tenant context (see tenant-context.ts).
 *
 * Keep this in sync with schema.prisma as new tenant-owned models are added
 * in later phases (Customer, Vehicle, JobCard, Part, Invoice, …).
 */
const TENANT_SCOPED_MODELS = new Set([
  'Branch',
  'User',
  'Role', // Role.tenantId is nullable (system roles) — handled specially below
  'AuditLog',
  'Customer',
  'Vehicle',
  'VehicleDocument',
  'Appointment',
  'Inspection',
  'InspectionItem',
  'InspectionPhoto',
  'Estimate',
  'EstimateLineItem',
  'EstimateApprovalEvent', // tenantId nullable in the schema only for the TOKEN_EXPIRED/TOKEN_INVALID rows written via prisma.platform directly — see estimate-approval.service.ts
  'LabourItem',
  'Technician',
  'JobCard',
  'JobCardLabour',
  'JobCardStatusHistory',
  'JobCardNote',
  'PartCategory',
  'Part',
  'InventoryTransaction',
  'Supplier',
  'PurchaseOrder',
  'PurchaseOrderItem',
  'GoodsReceipt',
  'GoodsReceiptItem',
  'PurchaseInvoice',
  'SupplierPayment',
  'JobCardPart',
  'Invoice',
  'InvoiceLineItem',
  'Payment',
  'Notification',
  'DeliveryLog',
  'AttendanceRecord',
]);

// Models whose tenantId is nullable by design (platform/system-level rows
// must remain visible without tenant scoping, e.g. SUPER_ADMIN's Role).
const NULLABLE_TENANT_MODELS = new Set(['Role']);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  /**
   * Escape hatch for genuinely platform-level operations (tenant
   * provisioning, Super Admin console, seeding, audit logging). Any use of
   * this outside `modules/tenants` for platform administration should be
   * treated as a code-review red flag.
   *
   * This is a plain field set once in the constructor, not a `get platform()`
   * accessor — Prisma Client wraps `this` in a Proxy, and that Proxy's `get`
   * trap does not preserve the correct receiver for accessor properties
   * defined on a subclass prototype (`this` inside such a getter resolves to
   * the unwrapped target, whose model delegates aren't callable the same
   * way). A field assigned in the constructor, where `this` is confirmed to
   * be the fully-constructed Proxy, sidesteps that entirely.
   */
  readonly platform: PrismaClient;

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
    this.platform = this;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Returns a tenant-scoped Prisma client. Use this (not the raw client)
   * in every service method that touches tenant-owned data. It reads the
   * current tenant from TenantContext (set by TenantGuard) so callers never
   * pass tenantId by hand — which is exactly the mistake this exists to
   * prevent.
   */
  forTenant() {
    const tenantId = TenantContext.requireTenantId();

    return this.$extends({
      query: {
        $allModels: {
          async $allOperations(params: {
            model?: string;
            operation: string;
            args: Record<string, unknown>;
            query: (args: Record<string, unknown>) => Promise<unknown>;
          }) {
            const { model, operation, args, query } = params;

            if (!model || !TENANT_SCOPED_MODELS.has(model)) {
              return query(args);
            }

            const isReadOrDelete = [
              'findFirst',
              'findFirstOrThrow',
              'findUnique',
              'findUniqueOrThrow',
              'findMany',
              'update',
              'updateMany',
              'delete',
              'deleteMany',
              'count',
              'aggregate',
            ].includes(operation);

            if (isReadOrDelete) {
              const a = args as Record<string, unknown>;
              a.where = injectTenantFilter(a.where, model, tenantId);
            }

            if (operation === 'create') {
              const a = args as Record<string, unknown>;
              a.data = { ...(a.data as Record<string, unknown>), tenantId };
            }

            if (operation === 'createMany') {
              const a = args as { data: Record<string, unknown>[] };
              a.data = a.data.map((row) => ({ ...row, tenantId }));
            }

            return query(args);
          },
        },
      },
    });
  }

}

function injectTenantFilter(
  where: unknown,
  model: string,
  tenantId: string,
): Record<string, unknown> {
  const w = (where as Record<string, unknown>) ?? {};

  if (NULLABLE_TENANT_MODELS.has(model)) {
    // System rows (tenantId = null) plus this tenant's rows.
    return {
      ...w,
      OR: [{ tenantId }, { tenantId: null }],
    };
  }

  return { ...w, tenantId };
}
