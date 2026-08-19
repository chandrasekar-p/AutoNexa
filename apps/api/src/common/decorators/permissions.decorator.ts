import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Declares which "resource:action" permissions are required to hit this
 * route. Checked by PermissionsGuard. Multiple permissions = ALL required.
 *
 * @Permissions('job-card:update')
 * @Permissions('invoice:create', 'invoice:read')
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
