import { ApiProperty } from '@nestjs/swagger';
import { ApiErrorCode } from '../enums/api-error-codes.enum';

/**
 * Standard Error Response DTO
 *
 * All API errors follow this structure for consistency
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Machine-readable error code for programmatic handling',
    enum: ApiErrorCode,
    example: ApiErrorCode.SHIFT_ALREADY_ACTIVE,
  })
  code: ApiErrorCode;

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'You already have an active shift',
  })
  message: string;

  @ApiProperty({
    description: 'HTTP error name',
    example: 'Bad Request',
  })
  error: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp of when the error occurred',
    example: '2024-01-10T10:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Request path that caused the error',
    example: '/api/shifts/clock-in',
  })
  path: string;

  @ApiProperty({
    description: 'Additional error details (optional)',
    required: false,
    example: { activeShiftId: 'uuid-here', distance: 150 },
  })
  details?: any;
}

/**
 * Validation Error Response DTO
 *
 * Extended error response for request validation failures
 */
export class ValidationErrorResponseDto extends ErrorResponseDto {
  @ApiProperty({
    description: 'Validation error details',
    example: {
      field: 'email',
      constraints: ['must be a valid email address'],
    },
  })
  details: {
    field: string;
    constraints: string[];
  }[];
}

/**
 * Example error responses for common scenarios
 */
export class ErrorExamples {
  static readonly SHIFT_ALREADY_ACTIVE = {
    statusCode: 400,
    code: ApiErrorCode.SHIFT_ALREADY_ACTIVE,
    message: 'Already clocked in. Active shift ID: 550e8400-e29b-41d4-a716-446655440000',
    error: 'Bad Request',
    timestamp: '2024-01-10T10:30:00.000Z',
    path: '/api/shifts/clock-in',
    details: {
      activeShiftId: '550e8400-e29b-41d4-a716-446655440000',
    },
  };

  static readonly SHIFT_GPS_OUT_OF_BOUNDS = {
    statusCode: 400,
    code: ApiErrorCode.SHIFT_GPS_OUT_OF_BOUNDS,
    message: 'GPS location is 150m away from area center. Must be within 100m',
    error: 'Bad Request',
    timestamp: '2024-01-10T10:30:00.000Z',
    path: '/api/shifts/clock-in',
    details: {
      distance: 150,
      maxDistance: 100,
    },
  };

  static readonly SHIFT_NOT_ACTIVE = {
    statusCode: 400,
    code: ApiErrorCode.SHIFT_NOT_ACTIVE,
    message: 'No active shift found',
    error: 'Bad Request',
    timestamp: '2024-01-10T10:30:00.000Z',
    path: '/api/shifts/clock-out',
  };

  static readonly AUTH_INVALID_CREDENTIALS = {
    statusCode: 401,
    code: ApiErrorCode.AUTH_INVALID_CREDENTIALS,
    message: 'Invalid credentials',
    error: 'Unauthorized',
    timestamp: '2024-01-10T10:30:00.000Z',
    path: '/api/auth/login',
  };

  static readonly AUTH_ACCOUNT_INACTIVE = {
    statusCode: 401,
    code: ApiErrorCode.AUTH_ACCOUNT_INACTIVE,
    message: 'User account is inactive',
    error: 'Unauthorized',
    timestamp: '2024-01-10T10:30:00.000Z',
    path: '/api/auth/login',
  };

  static readonly AUTH_TOKEN_EXPIRED = {
    statusCode: 401,
    code: ApiErrorCode.AUTH_TOKEN_EXPIRED,
    message: 'Token has expired',
    error: 'Unauthorized',
    timestamp: '2024-01-10T10:30:00.000Z',
    path: '/api/shifts/clock-in',
  };

  static readonly ACTIVITY_SHIFT_REQUIRED = {
    statusCode: 400,
    code: ApiErrorCode.ACTIVITY_SHIFT_REQUIRED,
    message:
      'Cannot create activity for completed shift. Activities must be created during active shifts.',
    error: 'Bad Request',
    timestamp: '2024-01-10T10:30:00.000Z',
    path: '/api/activities',
  };

  static readonly ACTIVITY_EDIT_WINDOW_CLOSED = {
    statusCode: 403,
    code: ApiErrorCode.ACTIVITY_EDIT_WINDOW_CLOSED,
    message: 'Activities can only be updated within 1 hour of creation',
    error: 'Forbidden',
    timestamp: '2024-01-10T10:30:00.000Z',
    path: '/api/activities/550e8400-e29b-41d4-a716-446655440000',
  };

  static readonly VALIDATION_ERROR = {
    statusCode: 400,
    code: ApiErrorCode.VALIDATION_ERROR,
    message: 'Validation failed',
    error: 'Bad Request',
    timestamp: '2024-01-10T10:30:00.000Z',
    path: '/api/shifts/clock-in',
    details: [
      {
        field: 'gps_lat',
        constraints: ['gps_lat must be a latitude string or number'],
      },
      {
        field: 'location_id',
        constraints: ['location_id must be a UUID'],
      },
    ],
  };
}
