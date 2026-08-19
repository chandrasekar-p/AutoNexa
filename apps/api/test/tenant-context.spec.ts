import { TenantContext } from '../src/prisma/tenant-context';

describe('TenantContext', () => {
  it('throws when accessed outside a request scope', () => {
    expect(() => TenantContext.requireTenantId()).toThrow(
      /accessed outside of a request scope/,
    );
  });

  it('returns the tenantId set for the current run() scope', () => {
    TenantContext.run(
      { tenantId: 'tenant-a', userId: 'user-1', isSuperAdmin: false },
      () => {
        expect(TenantContext.requireTenantId()).toBe('tenant-a');
      },
    );
  });

  it('isolates concurrent scopes from each other', async () => {
    const results: string[] = [];

    const runA = new Promise<void>((resolve) => {
      TenantContext.run({ tenantId: 'tenant-a', userId: 'u1', isSuperAdmin: false }, async () => {
        await delay(10);
        results.push(TenantContext.requireTenantId());
        resolve();
      });
    });

    const runB = new Promise<void>((resolve) => {
      TenantContext.run({ tenantId: 'tenant-b', userId: 'u2', isSuperAdmin: false }, async () => {
        await delay(5);
        results.push(TenantContext.requireTenantId());
        resolve();
      });
    });

    await Promise.all([runA, runB]);

    // Regardless of resolution order, each async chain must see its own
    // tenant, never the other's — this is the property multi-tenant
    // isolation depends on under concurrent request handling.
    expect(results.sort()).toEqual(['tenant-a', 'tenant-b']);
  });

  it('is not accessible after run() completes', () => {
    TenantContext.run({ tenantId: 'tenant-c', userId: 'u3', isSuperAdmin: false }, () => {});
    expect(() => TenantContext.requireTenantId()).toThrow();
  });
});

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
