import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { ApiException } from '../exceptions/api.exception';
import { ApiErrorCode } from '../enums/api-error-codes.enum';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockArgumentsHost: ArgumentsHost;
  let mockResponse: any;
  let mockRequest: any;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/api/v1/shifts/clock-in',
      method: 'POST',
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
      getArgByIndex: jest.fn(),
      getArgs: jest.fn(),
      getType: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ApiException handling', () => {
    it('should format ApiException with error code', () => {
      const exception = new ApiException(
        HttpStatus.BAD_REQUEST,
        ApiErrorCode.SHIFT_ALREADY_ACTIVE,
        'Worker already has an active shift',
        { activeShiftId: 'shift-uuid-123' },
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          code: ApiErrorCode.SHIFT_ALREADY_ACTIVE,
          message: 'Worker already has an active shift',
          error: 'Bad Request',
          details: { activeShiftId: 'shift-uuid-123' },
          timestamp: expect.any(String),
          path: '/api/v1/shifts/clock-in',
        }),
      );
    });

    it('should format ApiException without details', () => {
      const exception = new ApiException(
        HttpStatus.NOT_FOUND,
        ApiErrorCode.SHIFT_NOT_FOUND,
        'Shift not found',
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          code: ApiErrorCode.SHIFT_NOT_FOUND,
          message: 'Shift not found',
          error: 'Not Found',
          path: '/api/v1/shifts/clock-in',
        }),
      );

      // Ensure details is not present when not provided
      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall).not.toHaveProperty('details');
    });

    it('should include timestamp in ApiException response', () => {
      const exception = new ApiException(
        HttpStatus.UNAUTHORIZED,
        ApiErrorCode.AUTH_TOKEN_EXPIRED,
        'Token has expired',
      );

      const beforeTime = new Date().toISOString();
      filter.catch(exception, mockArgumentsHost);
      const afterTime = new Date().toISOString();

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.timestamp).toBeDefined();
      expect(jsonCall.timestamp >= beforeTime).toBe(true);
      expect(jsonCall.timestamp <= afterTime).toBe(true);
    });

    it('should handle GPS out of bounds error with distance details', () => {
      const exception = new ApiException(
        HttpStatus.BAD_REQUEST,
        ApiErrorCode.SHIFT_GPS_OUT_OF_BOUNDS,
        'GPS location is 500m from area center (max: 150m)',
        { distance: 500, maxDistance: 150 },
      );

      filter.catch(exception, mockArgumentsHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.code).toBe(ApiErrorCode.SHIFT_GPS_OUT_OF_BOUNDS);
      expect(jsonCall.details.distance).toBe(500);
      expect(jsonCall.details.maxDistance).toBe(150);
    });

    it('should handle report edit window closed error', () => {
      const exception = new ApiException(
        HttpStatus.FORBIDDEN,
        ApiErrorCode.REPORT_EDIT_WINDOW_CLOSED,
        'Reports can only be edited within 1 hour of creation',
        { elapsedHours: 2 },
      );

      filter.catch(exception, mockArgumentsHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.statusCode).toBe(HttpStatus.FORBIDDEN);
      expect(jsonCall.code).toBe(ApiErrorCode.REPORT_EDIT_WINDOW_CLOSED);
      expect(jsonCall.error).toBe('Forbidden');
    });
  });

  describe('Standard HttpException handling', () => {
    it('should add default error code to string HttpException', () => {
      const exception = new HttpException('Forbidden resource', HttpStatus.FORBIDDEN);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.FORBIDDEN,
          code: ApiErrorCode.FORBIDDEN,
          message: 'Forbidden resource',
          error: 'Forbidden',
          timestamp: expect.any(String),
          path: '/api/v1/shifts/clock-in',
        }),
      );
    });

    it('should add default error code to object HttpException', () => {
      const exception = new HttpException(
        {
          message: 'Validation failed',
          errors: ['field1 is required', 'field2 is invalid'],
        },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockArgumentsHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(jsonCall.code).toBe(ApiErrorCode.BAD_REQUEST);
      expect(jsonCall.message).toBe('Validation failed');
      expect(jsonCall.errors).toEqual(['field1 is required', 'field2 is invalid']);
    });

    it('should map 401 to AUTH_TOKEN_INVALID by default', () => {
      const exception = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

      filter.catch(exception, mockArgumentsHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.code).toBe(ApiErrorCode.AUTH_TOKEN_INVALID);
    });

    it('should map 404 to NOT_FOUND by default', () => {
      const exception = new HttpException('Resource not found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockArgumentsHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.code).toBe(ApiErrorCode.NOT_FOUND);
    });

    it('should map 409 to SYNC_CONFLICT by default', () => {
      const exception = new HttpException('Conflict detected', HttpStatus.CONFLICT);

      filter.catch(exception, mockArgumentsHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.code).toBe(ApiErrorCode.SYNC_CONFLICT);
    });

    it('should map 500 to INTERNAL_SERVER_ERROR by default', () => {
      const exception = new HttpException('Internal error', HttpStatus.INTERNAL_SERVER_ERROR);

      filter.catch(exception, mockArgumentsHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.code).toBe(ApiErrorCode.INTERNAL_SERVER_ERROR);
    });
  });

  describe('Unknown error handling', () => {
    it('should handle generic Error as internal server error', () => {
      const exception = new Error('Unexpected error occurred');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          code: ApiErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          error: 'Internal Server Error',
          timestamp: expect.any(String),
          path: '/api/v1/shifts/clock-in',
        }),
      );
    });

    it('should handle null exception as internal server error', () => {
      filter.catch(null, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.code).toBe(ApiErrorCode.INTERNAL_SERVER_ERROR);
    });

    it('should handle undefined exception as internal server error', () => {
      filter.catch(undefined, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.code).toBe(ApiErrorCode.INTERNAL_SERVER_ERROR);
    });

    it('should handle string exception as internal server error', () => {
      filter.catch('Something went wrong', mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.code).toBe(ApiErrorCode.INTERNAL_SERVER_ERROR);
      expect(jsonCall.message).toBe('Internal server error');
    });
  });

  describe('Error name mapping', () => {
    it('should return correct error name for 400', () => {
      const exception = new HttpException('Bad request', HttpStatus.BAD_REQUEST);
      filter.catch(exception, mockArgumentsHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.error).toBe('Bad Request');
    });

    it('should return correct error name for 401', () => {
      const exception = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      filter.catch(exception, mockArgumentsHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.error).toBe('Unauthorized');
    });

    it('should return correct error name for 403', () => {
      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      filter.catch(exception, mockArgumentsHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.error).toBe('Forbidden');
    });

    it('should return correct error name for 404', () => {
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);
      filter.catch(exception, mockArgumentsHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.error).toBe('Not Found');
    });

    it('should return correct error name for 409', () => {
      const exception = new HttpException('Conflict', HttpStatus.CONFLICT);
      filter.catch(exception, mockArgumentsHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.error).toBe('Conflict');
    });

    it('should return correct error name for 412', () => {
      const exception = new HttpException('Precondition failed', HttpStatus.PRECONDITION_FAILED);
      filter.catch(exception, mockArgumentsHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.error).toBe('Precondition Failed');
    });

    it('should return "Error" for unmapped status codes', () => {
      const exception = new HttpException('Teapot', HttpStatus.I_AM_A_TEAPOT);
      filter.catch(exception, mockArgumentsHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.error).toBe('Error');
    });
  });

  describe('Path inclusion', () => {
    it('should include request path in response', () => {
      mockRequest.url = '/api/v1/reports';
      const exception = new ApiException(
        HttpStatus.BAD_REQUEST,
        ApiErrorCode.REPORT_SHIFT_REQUIRED,
        'Shift required',
      );

      filter.catch(exception, mockArgumentsHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.path).toBe('/api/v1/reports');
    });

    it('should handle complex paths with query parameters', () => {
      mockRequest.url = '/api/v1/shifts?worker_id=123&from_date=2026-01-01';
      const exception = new HttpException('Bad request', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.path).toBe('/api/v1/shifts?worker_id=123&from_date=2026-01-01');
    });
  });

  describe('Logging behavior', () => {
    let loggerWarnSpy: jest.SpyInstance;
    let loggerErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      loggerWarnSpy = jest.spyOn(filter['logger'], 'warn').mockImplementation();
      loggerErrorSpy = jest.spyOn(filter['logger'], 'error').mockImplementation();
    });

    afterEach(() => {
      loggerWarnSpy.mockRestore();
      loggerErrorSpy.mockRestore();
    });

    it('should log warning for 4xx client errors', () => {
      const exception = new ApiException(
        HttpStatus.BAD_REQUEST,
        ApiErrorCode.SHIFT_ALREADY_ACTIVE,
        'Already active',
      );

      filter.catch(exception, mockArgumentsHost);

      expect(loggerWarnSpy).toHaveBeenCalled();
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('should log error for 5xx server errors', () => {
      const exception = new HttpException('Server error', HttpStatus.INTERNAL_SERVER_ERROR);

      filter.catch(exception, mockArgumentsHost);

      expect(loggerErrorSpy).toHaveBeenCalled();
    });

    it('should log error with stack for unknown exceptions', () => {
      const exception = new Error('Unexpected error');

      filter.catch(exception, mockArgumentsHost);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected error'),
        expect.any(String),
      );
    });

    it('should not log error for 404 Not Found', () => {
      const exception = new ApiException(
        HttpStatus.NOT_FOUND,
        ApiErrorCode.SHIFT_NOT_FOUND,
        'Shift not found',
      );

      filter.catch(exception, mockArgumentsHost);

      expect(loggerWarnSpy).toHaveBeenCalled();
      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Integration - Real-world scenarios', () => {
    it('should handle authentication failure correctly', () => {
      const exception = new ApiException(
        HttpStatus.UNAUTHORIZED,
        ApiErrorCode.AUTH_INVALID_CREDENTIALS,
        'Invalid username or password',
      );

      filter.catch(exception, mockArgumentsHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall).toMatchObject({
        statusCode: 401,
        code: ApiErrorCode.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid username or password',
        error: 'Unauthorized',
      });
    });

    it('should handle GPS validation failure correctly', () => {
      const exception = new ApiException(
        HttpStatus.BAD_REQUEST,
        ApiErrorCode.SHIFT_GPS_OUT_OF_BOUNDS,
        'GPS location is 500m from area center (max: 150m)',
        {
          workerLocation: { lat: -7.3037, lng: 112.7375 },
          areaCenter: { lat: -7.2905, lng: 112.7398 },
          distance: 500,
          maxDistance: 150,
        },
      );

      filter.catch(exception, mockArgumentsHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.code).toBe(ApiErrorCode.SHIFT_GPS_OUT_OF_BOUNDS);
      expect(jsonCall.details.distance).toBe(500);
      expect(jsonCall.details.workerLocation).toBeDefined();
    });

    it('should handle report creation during inactive shift', () => {
      const exception = new ApiException(
        HttpStatus.BAD_REQUEST,
        ApiErrorCode.REPORT_SHIFT_REQUIRED,
        'Cannot create report for completed shift',
      );

      filter.catch(exception, mockArgumentsHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.code).toBe(ApiErrorCode.REPORT_SHIFT_REQUIRED);
      expect(jsonCall.statusCode).toBe(400);
    });

    it('should handle worker access to supervisor-only endpoint', () => {
      const exception = new ApiException(
        HttpStatus.FORBIDDEN,
        ApiErrorCode.FORBIDDEN,
        'Insufficient permissions',
        { requiredRole: 'Supervisor', userRole: 'Worker' },
      );

      filter.catch(exception, mockArgumentsHost);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.code).toBe(ApiErrorCode.FORBIDDEN);
      expect(jsonCall.details.requiredRole).toBe('Supervisor');
    });
  });
});
