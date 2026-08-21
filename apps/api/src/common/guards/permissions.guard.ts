import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

/**
 * Enforces @Permissions(...) metadata against the JWT's flattened
 * permission set. Runs AFTER JwtAuthGuard (request.user must exist).
 * Super Admin bypasses per-permission checks entirely — it operates at
 * the platform level, outside tenant business-permission scope.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    if (!user) return false;

    if (user.isSuperAdmin) return true;

    const granted = new Set(user.permissions);
    const missing = required.filter((p) => !granted.has(p));
    if (missing.length > 0) {
      // User-facing message deliberately doesn't name the missing
      // resource:action strings — that's internal permission taxonomy, not
      // something a workshop user should have to parse. Real detail for
      // debugging belongs in server logs, not the response body.
      throw new ForbiddenException("You don't have permission to view this page.");
    }
    return true;
  }
}
