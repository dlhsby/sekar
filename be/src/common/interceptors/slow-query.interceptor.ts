import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const DEFAULT_WARN_MS = 500;
const DEFAULT_ERROR_MS = 2000;

const parseThreshold = (raw: string | undefined, fallback: number): number => {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

/**
 * Slow Query Interceptor (Phase 4 §B3)
 *
 * Surfaces slow requests at the application layer (complements TypeORM's
 * `maxQueryExecutionTime` DB-level logging). Warns above `SLOW_REQUEST_WARN_MS`
 * (default 500ms) and errors above `SLOW_REQUEST_ERROR_MS` (default 2000ms),
 * including the method + URL for context. No request bodies are logged (PII-safe).
 */
@Injectable()
export class SlowQueryInterceptor implements NestInterceptor {
  private readonly logger = new Logger('SlowRequest');
  private readonly warnMs = parseThreshold(process.env.SLOW_REQUEST_WARN_MS, DEFAULT_WARN_MS);
  private readonly errorMs = parseThreshold(process.env.SLOW_REQUEST_ERROR_MS, DEFAULT_ERROR_MS);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const start = Date.now();
    const label = `${req.method} ${req.originalUrl ?? req.url ?? ''}`;

    const report = (): void => {
      const elapsed = Date.now() - start;
      if (elapsed > this.errorMs) {
        this.logger.error(`Slow request (${elapsed}ms > ${this.errorMs}ms): ${label}`);
      } else if (elapsed > this.warnMs) {
        this.logger.warn(`Slow request (${elapsed}ms > ${this.warnMs}ms): ${label}`);
      }
    };

    return next.handle().pipe(tap({ next: report, error: report }));
  }
}
