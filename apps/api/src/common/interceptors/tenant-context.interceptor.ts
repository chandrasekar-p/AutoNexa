import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext } from '../../prisma/tenant-context';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

/**
 * Establishes the AsyncLocalStorage tenant context for the lifetime of the
 * request, based on the user JwtAuthGuard already attached. Every
 * PrismaService.forTenant() call downstream reads from this context — see
 * prisma/tenant-context.ts for why this is the enforcement backbone of
 * multi-tenant isolation.
 *
 * Public routes (no request.user) simply pass through untouched.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    if (!user) {
      return next.handle();
    }

    return new Observable((subscriber) => {
      TenantContext.run(
        { tenantId: user.tenantId, userId: user.userId, isSuperAdmin: user.isSuperAdmin },
        () => {
          next.handle().subscribe({
            next: (v) => subscriber.next(v),
            error: (e) => subscriber.error(e),
            complete: () => subscriber.complete(),
          });
        },
      );
    });
  }
}
