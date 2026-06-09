import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Structured request log entry (Phase 4 §B1).
 *
 * PII policy: request/response bodies, GPS coordinates, and credentials are NEVER
 * included. Only request metadata is logged.
 */
interface RequestLog {
  timestamp: string;
  requestId?: string;
  method: string;
  url: string;
  userId?: string;
  role?: string;
  statusCode: number;
  responseTime: number;
  userAgent?: string;
}

/** Path fragments excluded from request logging (health probes are high-frequency noise). */
const EXCLUDED_PATHS = ['/health/live', '/health/ready'];

/** Minimal request shape this interceptor reads (no body access — PII-safe). */
interface LoggableRequest {
  method: string;
  url?: string;
  originalUrl?: string;
  requestId?: string;
  headers?: Record<string, string | string[] | undefined>;
  user?: { id?: string; role?: string };
}

/**
 * Logging Interceptor (Phase 4 §B1)
 *
 * Emits exactly one structured log line per request once the response is produced.
 * JSON output (machine-parseable) in production; pretty-printed in development.
 * Health-probe endpoints are excluded to avoid flooding logs.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly isProduction = process.env.NODE_ENV === 'production';

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<LoggableRequest>();
    const url: string = req.originalUrl ?? req.url ?? '';

    if (EXCLUDED_PATHS.some((p) => url.includes(p))) {
      return next.handle();
    }

    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.write(context, req, url, start),
        error: () => this.write(context, req, url, start),
      }),
    );
  }

  private write(context: ExecutionContext, req: LoggableRequest, url: string, start: number): void {
    const res = context.switchToHttp().getResponse<{ statusCode: number }>();
    const header = (name: string): string | undefined => {
      const value = req.headers?.[name];
      return Array.isArray(value) ? value[0] : value;
    };
    const entry: RequestLog = {
      timestamp: new Date(start).toISOString(),
      requestId: req.requestId ?? header('x-request-id'),
      method: req.method,
      url,
      userId: req.user?.id,
      role: req.user?.role,
      statusCode: res.statusCode,
      responseTime: Date.now() - start,
      userAgent: header('user-agent'),
    };

    this.logger.log(this.isProduction ? JSON.stringify(entry) : JSON.stringify(entry, null, 2));
  }
}
