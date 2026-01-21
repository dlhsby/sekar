import { HttpException, HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from '../enums/api-error-codes.enum';

/**
 * Custom API Exception
 *
 * Extends NestJS HttpException to include a standardized error code
 * that mobile clients can use for programmatic error handling.
 *
 * @example
 * ```typescript
 * throw new ApiException(
 *   HttpStatus.BAD_REQUEST,
 *   ApiErrorCode.SHIFT_ALREADY_ACTIVE,
 *   'You already have an active shift',
 *   { activeShiftId: 'uuid-here' }
 * );
 * ```
 */
export class ApiException extends HttpException {
  /**
   * Create a new API exception
   *
   * @param statusCode HTTP status code (e.g., 400, 401, 404)
   * @param code Standardized error code from ApiErrorCode enum
   * @param message Human-readable error message
   * @param details Optional additional details (e.g., validation errors, metadata)
   */
  constructor(
    statusCode: HttpStatus,
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: any,
  ) {
    // Map status code to error name
    const errorNames: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'Bad Request',
      [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
      [HttpStatus.FORBIDDEN]: 'Forbidden',
      [HttpStatus.NOT_FOUND]: 'Not Found',
      [HttpStatus.CONFLICT]: 'Conflict',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
    };

    const response = {
      statusCode,
      code,
      message,
      error: errorNames[statusCode] || 'Error',
      ...(details && { details }),
      timestamp: new Date().toISOString(),
    };

    super(response, statusCode);
  }

  /**
   * Get the error code
   */
  getCode(): ApiErrorCode {
    return this.code;
  }

  /**
   * Get additional error details
   */
  getDetails(): any {
    return this.details;
  }
}

/**
 * Helper functions to create common API exceptions
 */
export class ApiExceptionHelpers {
  /**
   * Create a BadRequest (400) exception
   */
  static badRequest(code: ApiErrorCode, message: string, details?: any): ApiException {
    return new ApiException(HttpStatus.BAD_REQUEST, code, message, details);
  }

  /**
   * Create an Unauthorized (401) exception
   */
  static unauthorized(code: ApiErrorCode, message: string, details?: any): ApiException {
    return new ApiException(HttpStatus.UNAUTHORIZED, code, message, details);
  }

  /**
   * Create a Forbidden (403) exception
   */
  static forbidden(code: ApiErrorCode, message: string, details?: any): ApiException {
    return new ApiException(HttpStatus.FORBIDDEN, code, message, details);
  }

  /**
   * Create a NotFound (404) exception
   */
  static notFound(code: ApiErrorCode, message: string, details?: any): ApiException {
    return new ApiException(HttpStatus.NOT_FOUND, code, message, details);
  }

  /**
   * Create a Conflict (409) exception
   */
  static conflict(code: ApiErrorCode, message: string, details?: any): ApiException {
    return new ApiException(HttpStatus.CONFLICT, code, message, details);
  }

  /**
   * Create an InternalServerError (500) exception
   */
  static internalError(message = 'Internal server error', details?: any): ApiException {
    return new ApiException(
      HttpStatus.INTERNAL_SERVER_ERROR,
      ApiErrorCode.INTERNAL_SERVER_ERROR,
      message,
      details,
    );
  }
}
