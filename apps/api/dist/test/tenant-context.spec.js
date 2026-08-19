"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tenant_context_1 = require("../src/prisma/tenant-context");
describe('TenantContext', () => {
    it('throws when accessed outside a request scope', () => {
        expect(() => tenant_context_1.TenantContext.requireTenantId()).toThrow(/accessed outside of a request scope/);
    });
    it('returns the tenantId set for the current run() scope', () => {
        tenant_context_1.TenantContext.run({ tenantId: 'tenant-a', userId: 'user-1', isSuperAdmin: false }, () => {
            expect(tenant_context_1.TenantContext.requireTenantId()).toBe('tenant-a');
        });
    });
    it('isolates concurrent scopes from each other', async () => {
        const results = [];
        const runA = new Promise((resolve) => {
            tenant_context_1.TenantContext.run({ tenantId: 'tenant-a', userId: 'u1', isSuperAdmin: false }, async () => {
                await delay(10);
                results.push(tenant_context_1.TenantContext.requireTenantId());
                resolve();
            });
        });
        const runB = new Promise((resolve) => {
            tenant_context_1.TenantContext.run({ tenantId: 'tenant-b', userId: 'u2', isSuperAdmin: false }, async () => {
                await delay(5);
                results.push(tenant_context_1.TenantContext.requireTenantId());
                resolve();
            });
        });
        await Promise.all([runA, runB]);
        expect(results.sort()).toEqual(['tenant-a', 'tenant-b']);
    });
    it('is not accessible after run() completes', () => {
        tenant_context_1.TenantContext.run({ tenantId: 'tenant-c', userId: 'u3', isSuperAdmin: false }, () => { });
        expect(() => tenant_context_1.TenantContext.requireTenantId()).toThrow();
    });
});
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=tenant-context.spec.js.map