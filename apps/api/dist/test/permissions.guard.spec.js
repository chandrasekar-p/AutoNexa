"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const permissions_guard_1 = require("../src/common/guards/permissions.guard");
function makeContext(user, handlerMeta) {
    const reflector = { getAllAndOverride: () => handlerMeta };
    const guard = new permissions_guard_1.PermissionsGuard(reflector);
    const context = {
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
        getHandler: () => ({}),
        getClass: () => ({}),
    };
    return { guard, context };
}
describe('PermissionsGuard', () => {
    it('allows the request when no @Permissions() metadata is present', () => {
        const { guard, context } = makeContext({ permissions: [] }, undefined);
        expect(guard.canActivate(context)).toBe(true);
    });
    it('allows a super admin regardless of granted permissions', () => {
        const { guard, context } = makeContext({ permissions: [], isSuperAdmin: true }, ['job-card:update']);
        expect(guard.canActivate(context)).toBe(true);
    });
    it('allows a user who holds every required permission', () => {
        const { guard, context } = makeContext({ permissions: ['job-card:update', 'job-card:read'], isSuperAdmin: false }, ['job-card:update']);
        expect(guard.canActivate(context)).toBe(true);
    });
    it('rejects a user missing a required permission', () => {
        const { guard, context } = makeContext({ permissions: ['job-card:read'], isSuperAdmin: false }, ['job-card:update']);
        expect(() => guard.canActivate(context)).toThrow(common_1.ForbiddenException);
    });
    it('rejects when there is no authenticated user at all', () => {
        const { guard, context } = makeContext(undefined, ['job-card:update']);
        expect(guard.canActivate(context)).toBe(false);
    });
});
//# sourceMappingURL=permissions.guard.spec.js.map