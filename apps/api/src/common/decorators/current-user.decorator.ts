import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  email: string;
  permissions: string[]; // flattened "resource:action" strings
  isSuperAdmin: boolean;
}

/**
 * Pulls the authenticated user off the request (populated by JwtAuthGuard).
 * Usage: findMyStuff(@CurrentUser() user: AuthenticatedUser)
 */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
