import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

export const AUDIT_KEY = 'audit';

/**
 * Marks a mutating route for audit logging.
 * @Audit('user.create', 'User')
 */
export const Audit = (action: string, entity: string) =>
  SetMetadata(AUDIT_KEY, { action, entity });

/**
 * Writes an AuditLog row after a successful @Audit()-tagged mutation.
 * Kept intentionally simple here (logs the response payload as newValue);
 * modules that need before/after diffing (e.g. invoices, stock adjustments)
 * should capture oldValue explicitly in their service method and pass it
 * through request-scoped state, extended in a later phase.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<{ action: string; entity: string } | undefined>(
      AUDIT_KEY,
      context.getHandler(),
    );
    if (!meta) return next.handle();

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    return next.handle().pipe(
      tap(async (result) => {
        if (!user) return;
        await this.prisma.platform.auditLog.create({
          data: {
            tenantId: user.tenantId,
            userId: user.userId,
            action: meta.action,
            entity: meta.entity,
            entityId: (result as { id?: string })?.id ?? 'unknown',
            newValue: result as object,
            ipAddress: request.ip,
          },
        });
      }),
    );
  }
}
