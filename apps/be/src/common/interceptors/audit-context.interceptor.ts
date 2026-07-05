import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { auditContext } from '../context/audit-context';

/**
 * Runs each request handler inside the audit AsyncLocalStorage context, seeded
 * with the authenticated user's id (set on req.user by JwtAuthGuard). The
 * handler — and the DB work it triggers — then executes within that context so
 * the AuditSubscriber can read the actor. Wraps the subscription (not just
 * next.handle()) so the context stays active while the handler runs.
 */
@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ user?: { id?: string } }>();
    const userId = req?.user?.id;

    return new Observable((observer) => {
      auditContext.run({ userId }, () => {
        next.handle().subscribe({
          next: (value) => observer.next(value),
          error: (err) => observer.error(err),
          complete: () => observer.complete(),
        });
      });
    });
  }
}
