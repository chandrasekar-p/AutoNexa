import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

/**
 * Restricts a route to the platform-level Super Admin role, regardless of
 * what tenant-scoped permissions the caller might otherwise hold. Used for
 * cross-tenant operations (provisioning new workshops, platform support)
 * that must never be reachable by a workshop's own staff, no matter how
 * their role/permissions are configured.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    if (!user?.isSuperAdmin) {
      throw new ForbiddenException('This action requires platform Super Admin access');
    }
    return true;
  }
}
