import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '../src/common/guards/permissions.guard';

function makeContext(user: unknown, handlerMeta: string[] | undefined) {
  const reflector = { getAllAndOverride: () => handlerMeta } as unknown as Reflector;
  const guard = new PermissionsGuard(reflector);
  const context = {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
  return { guard, context };
}

describe('PermissionsGuard', () => {
  it('allows the request when no @Permissions() metadata is present', () => {
    const { guard, context } = makeContext({ permissions: [] }, undefined);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows a super admin regardless of granted permissions', () => {
    const { guard, context } = makeContext(
      { permissions: [], isSuperAdmin: true },
      ['job-card:update'],
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows a user who holds every required permission', () => {
    const { guard, context } = makeContext(
      { permissions: ['job-card:update', 'job-card:read'], isSuperAdmin: false },
      ['job-card:update'],
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects a user missing a required permission', () => {
    const { guard, context } = makeContext(
      { permissions: ['job-card:read'], isSuperAdmin: false },
      ['job-card:update'],
    );
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('rejects when there is no authenticated user at all', () => {
    const { guard, context } = makeContext(undefined, ['job-card:update']);
    expect(guard.canActivate(context)).toBe(false);
  });
});
