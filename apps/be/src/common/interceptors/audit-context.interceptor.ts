import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { auditContext, type AuditStore } from '../context/audit-context';

/**
 * Runs each request handler inside the audit AsyncLocalStorage context, seeded
 * with the authenticated user's id (set on req.user by JwtAuthGuard). The
 * handler — and the DB work it triggers — then executes within that context so
 * the AuditSubscriber can read the actor. Wraps the subscription (not just
 * next.handle()) so the context stays active while the handler runs.
 */
interface RequestLike {
  user?: { id?: string; role?: string; full_name?: string };
  ip?: string;
  requestId?: string;
  headers?: Record<string, string | string[] | undefined>;
}

const USER_AGENT_MAX = 300;
const REQUEST_ID_MAX = 64;

/** Actor + request snapshot for audit rows (trust proxy is set, so req.ip is the client). */
export function storeFrom(req: RequestLike | undefined): AuditStore {
  const ua = req?.headers?.['user-agent'];
  return {
    userId: req?.user?.id,
    role: req?.user?.role,
    name: req?.user?.full_name,
    ip: req?.ip,
    userAgent: (Array.isArray(ua) ? ua[0] : ua)?.slice(0, USER_AGENT_MAX),
    // Client-suppliable header — cap it so it cannot bloat an append-only row.
    requestId: req?.requestId?.slice(0, REQUEST_ID_MAX),
  };
}

@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const store = storeFrom(context.switchToHttp().getRequest<RequestLike>());

    return new Observable((observer) => {
      auditContext.run(store, () => {
        next.handle().subscribe({
          next: (value) => observer.next(value),
          error: (err) => observer.error(err),
          complete: () => observer.complete(),
        });
      });
    });
  }
}
