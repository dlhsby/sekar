import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * API Version Interceptor
 *
 * Logs API version usage from X-API-Version header for monitoring purposes.
 * This helps track which clients are using which API versions, preparing for future
 * multi-version support.
 *
 * Header format: X-API-Version: v1
 */
@Injectable()
export class ApiVersionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ApiVersionInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const apiVersion = request.headers['x-api-version'];

    // Log API version if provided by client
    if (apiVersion) {
      this.logger.debug(`API Version ${apiVersion} requested for ${request.method} ${request.url}`);
    }

    // Add API version to response headers for client reference
    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        response.setHeader('X-API-Version', 'v1');
      }),
    );
  }
}
