import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Request-scoped tenant context, populated once per request by TenantGuard
 * (see common/guards/tenant.guard.ts) immediately after JWT validation.
 *
 * This is deliberately NOT a Nest request-scoped provider: request-scoped
 * providers re-instantiate the whole DI subtree per request, which is
 * expensive. AsyncLocalStorage gives us the same "current tenant" access
 * from anywhere (including the Prisma extension below) without that cost.
 */
export interface TenantContextData {
  tenantId: string;
  userId: string;
  isSuperAdmin: boolean;
}

export class TenantContext {
  private static readonly storage = new AsyncLocalStorage<TenantContextData>();

  static run<T>(data: TenantContextData, fn: () => T): T {
    return this.storage.run(data, fn);
  }

  static get(): TenantContextData | undefined {
    return this.storage.getStore();
  }

  static requireTenantId(): string {
    const ctx = this.storage.getStore();
    if (!ctx) {
      // Fail closed: any tenant-scoped query executed without a resolved
      // request context is a bug, not a "return everything" situation.
      throw new Error(
        'TenantContext accessed outside of a request scope. ' +
          'Every tenant-scoped query must run within TenantGuard-established context.',
      );
    }
    return ctx.tenantId;
  }
}
