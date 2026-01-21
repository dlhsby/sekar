import { HttpStatus } from '@nestjs/common';
import { ApiException, ApiExceptionHelpers } from './api.exception';
import { ApiErrorCode } from '../enums/api-error-codes.enum';

describe('ApiException', () => {
  describe('constructor', () => {
    it('should create ApiException with all parameters', () => {
      const statusCode = HttpStatus.BAD_REQUEST;
      const code = ApiErrorCode.SHIFT_ALREADY_ACTIVE;
      const message = 'Worker already has an active shift';
      const details = { activeShiftId: 'shift-uuid-123' };

      const exception = new ApiException(statusCode, code, message, details);

      expect(exception).toBeInstanceOf(ApiException);
      expect(exception.getStatus()).toBe(statusCode);
      expect(exception.getCode()).toBe(code);
      expect(exception.message).toBe(message);
      expect(exception.getDetails()).toEqual(details);
    });

    it('should create ApiException without details', () => {
      const statusCode = HttpStatus.NOT_FOUND;
      const code = ApiErrorCode.SHIFT_NOT_FOUND;
      const message = 'Shift not found';

      const exception = new ApiException(statusCode, code, message);

      expect(exception.getStatus()).toBe(statusCode);
      expect(exception.getCode()).toBe(code);
      expect(exception.message).toBe(message);
      expect(exception.getDetails()).toBeUndefined();
    });

    it('should include timestamp in response', () => {
      const exception = new ApiException(
        HttpStatus.BAD_REQUEST,
        ApiErrorCode.VALIDATION_ERROR,
        'Validation failed',
      );

      const response: any = exception.getResponse();
      expect(response.timestamp).toBeDefined();
      expect(new Date(response.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should include error name in response', () => {
      const exception = new ApiException(
        HttpStatus.BAD_REQUEST,
        ApiErrorCode.VALIDATION_ERROR,
        'Validation failed',
      );

      const response: any = exception.getResponse();
      expect(response.error).toBe('Bad Request');
    });

    it('should structure response correctly', () => {
      const statusCode = HttpStatus.FORBIDDEN;
      const code = ApiErrorCode.REPORT_EDIT_WINDOW_CLOSED;
      const message = 'Reports can only be edited within 1 hour';
      const details = { elapsedHours: 2 };

      const exception = new ApiException(statusCode, code, message, details);
      const response: any = exception.getResponse();

      expect(response).toMatchObject({
        statusCode,
        code,
        message,
        error: 'Forbidden',
        details,
      });
      expect(response.timestamp).toBeDefined();
    });
  });

  describe('getCode', () => {
    it('should return the error code', () => {
      const code = ApiErrorCode.AUTH_INVALID_CREDENTIALS;
      const exception = new ApiException(HttpStatus.UNAUTHORIZED, code, 'Invalid credentials');

      expect(exception.getCode()).toBe(code);
    });
  });

  describe('getDetails', () => {
    it('should return details when provided', () => {
      const details = {
        field: 'email',
        constraint: 'isEmail',
        value: 'invalid-email',
      };
      const exception = new ApiException(
        HttpStatus.BAD_REQUEST,
        ApiErrorCode.VALIDATION_ERROR,
        'Validation failed',
        details,
      );

      expect(exception.getDetails()).toEqual(details);
    });

    it('should return undefined when no details provided', () => {
      const exception = new ApiException(
        HttpStatus.INTERNAL_SERVER_ERROR,
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        'Internal server error',
      );

      expect(exception.getDetails()).toBeUndefined();
    });

    it('should handle complex nested details', () => {
      const details = {
        validationErrors: [
          { field: 'username', message: 'Username is required' },
          { field: 'password', message: 'Password is too short' },
        ],
        requestId: 'req-123',
      };
      const exception = new ApiException(
        HttpStatus.BAD_REQUEST,
        ApiErrorCode.VALIDATION_ERROR,
        'Validation failed',
        details,
      );

      expect(exception.getDetails()).toEqual(details);
    });
  });
});

describe('ApiExceptionHelpers', () => {
  describe('badRequest', () => {
    it('should create BadRequest exception with code', () => {
      const code = ApiErrorCode.SHIFT_GPS_OUT_OF_BOUNDS;
      const message = 'GPS location is outside allowed area';
      const details = { distance: 500, maxDistance: 150 };

      const exception = ApiExceptionHelpers.badRequest(code, message, details);

      expect(exception).toBeInstanceOf(ApiException);
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.getCode()).toBe(code);
      expect(exception.message).toBe(message);
      expect(exception.getDetails()).toEqual(details);
    });

    it('should create BadRequest exception without details', () => {
      const exception = ApiExceptionHelpers.badRequest(ApiErrorCode.BAD_REQUEST, 'Invalid request');

      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.getCode()).toBe(ApiErrorCode.BAD_REQUEST);
    });
  });

  describe('unauthorized', () => {
    it('should create Unauthorized exception with code', () => {
      const code = ApiErrorCode.AUTH_TOKEN_EXPIRED;
      const message = 'JWT token has expired';

      const exception = ApiExceptionHelpers.unauthorized(code, message);

      expect(exception).toBeInstanceOf(ApiException);
      expect(exception.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect(exception.getCode()).toBe(code);
      expect(exception.message).toBe(message);
    });

    it('should include details in unauthorized exception', () => {
      const details = { expiredAt: '2026-01-16T10:00:00Z' };
      const exception = ApiExceptionHelpers.unauthorized(
        ApiErrorCode.AUTH_TOKEN_EXPIRED,
        'Token expired',
        details,
      );

      expect(exception.getDetails()).toEqual(details);
    });
  });

  describe('forbidden', () => {
    it('should create Forbidden exception with code', () => {
      const code = ApiErrorCode.REPORT_ACCESS_DENIED;
      const message = 'You can only access your own reports';

      const exception = ApiExceptionHelpers.forbidden(code, message);

      expect(exception).toBeInstanceOf(ApiException);
      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(exception.getCode()).toBe(code);
      expect(exception.message).toBe(message);
    });
  });

  describe('notFound', () => {
    it('should create NotFound exception with code', () => {
      const code = ApiErrorCode.AREA_NOT_FOUND;
      const message = 'Area not found';
      const details = { areaId: 'area-uuid-123' };

      const exception = ApiExceptionHelpers.notFound(code, message, details);

      expect(exception).toBeInstanceOf(ApiException);
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(exception.getCode()).toBe(code);
      expect(exception.message).toBe(message);
      expect(exception.getDetails()).toEqual(details);
    });
  });

  describe('conflict', () => {
    it('should create Conflict exception with code', () => {
      const code = ApiErrorCode.AREA_CODE_DUPLICATE;
      const message = 'Area code already exists';
      const details = { code: 'TBK-001' };

      const exception = ApiExceptionHelpers.conflict(code, message, details);

      expect(exception).toBeInstanceOf(ApiException);
      expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);
      expect(exception.getCode()).toBe(code);
      expect(exception.message).toBe(message);
      expect(exception.getDetails()).toEqual(details);
    });
  });

  describe('internalError', () => {
    it('should create InternalServerError with default message', () => {
      const exception = ApiExceptionHelpers.internalError();

      expect(exception).toBeInstanceOf(ApiException);
      expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(exception.getCode()).toBe(ApiErrorCode.INTERNAL_SERVER_ERROR);
      expect(exception.message).toBe('Internal server error');
    });

    it('should create InternalServerError with custom message', () => {
      const message = 'Database connection failed';
      const exception = ApiExceptionHelpers.internalError(message);

      expect(exception.message).toBe(message);
      expect(exception.getCode()).toBe(ApiErrorCode.INTERNAL_SERVER_ERROR);
    });

    it('should include details in InternalServerError', () => {
      const details = { error: 'Connection timeout', retryAfter: 5000 };
      const exception = ApiExceptionHelpers.internalError('Service unavailable', details);

      expect(exception.getDetails()).toEqual(details);
    });
  });

  describe('integration - all helper methods', () => {
    it('should create distinct exceptions for each HTTP status', () => {
      const badRequest = ApiExceptionHelpers.badRequest(ApiErrorCode.BAD_REQUEST, 'Bad request');
      const unauthorized = ApiExceptionHelpers.unauthorized(
        ApiErrorCode.AUTH_TOKEN_INVALID,
        'Unauthorized',
      );
      const forbidden = ApiExceptionHelpers.forbidden(ApiErrorCode.FORBIDDEN, 'Forbidden');
      const notFound = ApiExceptionHelpers.notFound(ApiErrorCode.NOT_FOUND, 'Not found');
      const conflict = ApiExceptionHelpers.conflict(ApiErrorCode.SYNC_CONFLICT, 'Conflict');
      const internalError = ApiExceptionHelpers.internalError();

      expect(badRequest.getStatus()).toBe(400);
      expect(unauthorized.getStatus()).toBe(401);
      expect(forbidden.getStatus()).toBe(403);
      expect(notFound.getStatus()).toBe(404);
      expect(conflict.getStatus()).toBe(409);
      expect(internalError.getStatus()).toBe(500);
    });

    it('should preserve error codes for each exception type', () => {
      const exceptions = [
        ApiExceptionHelpers.badRequest(ApiErrorCode.SHIFT_ALREADY_ACTIVE, 'Already active'),
        ApiExceptionHelpers.unauthorized(
          ApiErrorCode.AUTH_INVALID_CREDENTIALS,
          'Invalid credentials',
        ),
        ApiExceptionHelpers.forbidden(ApiErrorCode.REPORT_EDIT_WINDOW_CLOSED, 'Window closed'),
        ApiExceptionHelpers.notFound(ApiErrorCode.SHIFT_NOT_FOUND, 'Not found'),
        ApiExceptionHelpers.conflict(ApiErrorCode.ASSIGNMENT_ALREADY_EXISTS, 'Already exists'),
      ];

      expect(exceptions[0].getCode()).toBe(ApiErrorCode.SHIFT_ALREADY_ACTIVE);
      expect(exceptions[1].getCode()).toBe(ApiErrorCode.AUTH_INVALID_CREDENTIALS);
      expect(exceptions[2].getCode()).toBe(ApiErrorCode.REPORT_EDIT_WINDOW_CLOSED);
      expect(exceptions[3].getCode()).toBe(ApiErrorCode.SHIFT_NOT_FOUND);
      expect(exceptions[4].getCode()).toBe(ApiErrorCode.ASSIGNMENT_ALREADY_EXISTS);
    });
  });
});
