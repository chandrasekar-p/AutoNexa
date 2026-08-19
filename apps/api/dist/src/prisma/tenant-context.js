"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantContext = void 0;
const node_async_hooks_1 = require("node:async_hooks");
class TenantContext {
    static run(data, fn) {
        return this.storage.run(data, fn);
    }
    static get() {
        return this.storage.getStore();
    }
    static requireTenantId() {
        const ctx = this.storage.getStore();
        if (!ctx) {
            throw new Error('TenantContext accessed outside of a request scope. ' +
                'Every tenant-scoped query must run within TenantGuard-established context.');
        }
        return ctx.tenantId;
    }
}
exports.TenantContext = TenantContext;
TenantContext.storage = new node_async_hooks_1.AsyncLocalStorage();
//# sourceMappingURL=tenant-context.js.map