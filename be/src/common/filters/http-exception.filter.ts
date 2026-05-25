import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiException } from '../exceptions/api.exception';
import { ApiErrorCode } from '../enums/api-error-codes.enum';
import { captureException } from '../sentry/sentry';

interface AuthenticatedRequest extends Request {
  user?: { id?: string; role?: string };
}

/**
 * Global HTTP Exception Filter
 *
 * Intercepts all exceptions and formats them with consistent structure:
 * - Includes error code for programmatic handling
 * - Maintains backward compatibility with existing error messages
 * - Logs errors for debugging
 * - Handles both ApiException and standard HttpException
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status code and error response
    let statusCode: number;
    let errorResponse: any;

    if (exception instanceof ApiException) {
      // Custom API exception with error code
      statusCode = exception.getStatus();
      errorResponse = {
        statusCode,
        code: exception.getCode(),
        message: exception.message,
        error: this.getErrorName(statusCode),
        ...(exception.getDetails() && { details: exception.getDetails() }),
        timestamp: new Date().toISOString(),
        path: request.url,
      };
    } else if (exception instanceof HttpException) {
      // Standard NestJS HttpException - add default error code
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        errorResponse = {
          statusCode,
          code: this.getDefaultErrorCode(statusCode),
          message: exceptionResponse,
          error: this.getErrorName(statusCode),
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      } else if (typeof exceptionResponse === 'object') {
        errorResponse = {
          statusCode,
          code: this.getDefaultErrorCode(statusCode),
          ...(exceptionResponse as object),
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }
    } else {
      // Unknown error - treat as internal server error
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      errorResponse = {
        statusCode,
        code: ApiErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: 'Internal Server Error',
        timestamp: new Date().toISOString(),
        path: request.url,
      };

      // Log unexpected errors
      this.logger.error(
        `Unexpected error: ${exception}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    // Log error for monitoring (except common client errors)
    if (statusCode >= 500) {
      this.logger.error(
        `HTTP ${statusCode} Error: ${JSON.stringify(errorResponse)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      // Capture to Sentry (no-op when SENTRY_DSN unset). Skip 4xx — those are
      // validation/auth/permission failures and create noise, not anomalies.
      const authReq = request as AuthenticatedRequest;
      const reqId = request.headers?.['x-request-id'];
      captureException(exception, {
        userId: authReq.user?.id,
        role: authReq.user?.role,
        requestId: typeof reqId === 'string' ? reqId : undefined,
        route: request.url,
      });
    } else if (statusCode >= 400) {
      this.logger.warn(`HTTP ${statusCode} Error: ${errorResponse.message} - Path: ${request.url}`);
    }

    // Set API version header on error responses (matching ApiVersionInterceptor)
    response.setHeader('X-API-Version', '1');

    response.status(statusCode).json(errorResponse);
  }

  /**
   * Get human-readable error name from HTTP status code
   */
  private getErrorName(statusCode: number): string {
    const errorNames: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      412: 'Precondition Failed',
      500: 'Internal Server Error',
    };

    return errorNames[statusCode] || 'Error';
  }

  /**
   * Get default error code for standard HTTP exceptions
   */
  private getDefaultErrorCode(statusCode: number): ApiErrorCode {
    const codeMap: Record<number, ApiErrorCode> = {
      400: ApiErrorCode.BAD_REQUEST,
      401: ApiErrorCode.AUTH_TOKEN_INVALID,
      403: ApiErrorCode.FORBIDDEN,
      404: ApiErrorCode.NOT_FOUND,
      409: ApiErrorCode.SYNC_CONFLICT,
      500: ApiErrorCode.INTERNAL_SERVER_ERROR,
    };

    return codeMap[statusCode] || ApiErrorCode.INTERNAL_SERVER_ERROR;
  }
}
