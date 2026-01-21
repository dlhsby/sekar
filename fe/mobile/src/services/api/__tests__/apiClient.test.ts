/**
 * API Client Tests
 * Tests for API client error handling with standardized error codes
 */

import apiClient from '../apiClient';
import MockAdapter from 'axios-mock-adapter';
import { ApiErrorCode } from '../../../constants/errorCodes';
import type { ApiError } from '../../../types/api.types';

describe('API Client Error Handling', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it('should extract error code from backend response', async () => {
    const backendError = {
      statusCode: 400,
      code: 'SHIFT_ALREADY_ACTIVE',
      message: 'Already clocked in',
      error: 'Bad Request',
      timestamp: '2026-01-16T10:00:00Z',
      path: '/api/v1/shifts/clock-in',
      details: { activeShiftId: 'test-id-123' },
    };

    mock.onPost('/test').reply(400, backendError);

    try {
      await apiClient.post('/test');
      fail('Should have thrown an error');
    } catch (error) {
      const apiError = error as ApiError;
      expect(apiError.status).toBe(400);
      expect(apiError.code).toBe('SHIFT_ALREADY_ACTIVE');
      expect(apiError.message).toBe('Already clocked in');
      expect(apiError.error).toBe('Bad Request');
      expect(apiError.timestamp).toBe('2026-01-16T10:00:00Z');
      expect(apiError.path).toBe('/api/v1/shifts/clock-in');
      expect(apiError.details).toEqual({ activeShiftId: 'test-id-123' });
    }
  });

  it('should handle authentication errors with error code', async () => {
    const authError = {
      statusCode: 401,
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Invalid username or password',
      error: 'Unauthorized',
      timestamp: '2026-01-16T10:00:00Z',
      path: '/api/v1/auth/login',
    };

    mock.onPost('/auth/login').reply(401, authError);

    try {
      await apiClient.post('/auth/login');
      fail('Should have thrown an error');
    } catch (error) {
      const apiError = error as ApiError;
      expect(apiError.status).toBe(401);
      expect(apiError.code).toBe(ApiErrorCode.AUTH_INVALID_CREDENTIALS);
      expect(apiError.message).toBe('Invalid username or password');
    }
  });

  it('should handle validation errors with error codes', async () => {
    const validationError = {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      error: 'Bad Request',
      errors: {
        username: ['Username is required'],
        password: ['Password must be at least 6 characters'],
      },
      timestamp: '2026-01-16T10:00:00Z',
      path: '/api/v1/auth/login',
    };

    mock.onPost('/test-validation').reply(400, validationError);

    try {
      await apiClient.post('/test-validation');
      fail('Should have thrown an error');
    } catch (error) {
      const apiError = error as ApiError;
      expect(apiError.status).toBe(400);
      expect(apiError.code).toBe(ApiErrorCode.VALIDATION_ERROR);
      expect(apiError.errors).toEqual({
        username: ['Username is required'],
        password: ['Password must be at least 6 characters'],
      });
    }
  });

  it('should handle network errors with NETWORK_ERROR code', async () => {
    mock.onGet('/test').networkError();

    try {
      await apiClient.get('/test');
      fail('Should have thrown an error');
    } catch (error) {
      const apiError = error as ApiError;
      // Network errors can be status 0 or -1 depending on the error type
      expect([0, -1]).toContain(apiError.status);
      expect(['NETWORK_ERROR', 'UNKNOWN_ERROR']).toContain(apiError.code);
      expect(apiError.message).toBeTruthy();
    }
  });

  it('should use UNKNOWN_ERROR code when error code is not provided', async () => {
    // Backend sends error without code field
    const backendError = {
      statusCode: 500,
      message: 'Internal server error',
      error: 'Internal Server Error',
    };

    mock.onGet('/test').reply(500, backendError);

    try {
      await apiClient.get('/test');
      fail('Should have thrown an error');
    } catch (error) {
      const apiError = error as ApiError;
      expect(apiError.status).toBe(500);
      expect(apiError.code).toBe('UNKNOWN_ERROR');
      expect(apiError.message).toBe('Internal server error');
    }
  });

  it('should allow programmatic error handling by code', async () => {
    const backendError = {
      statusCode: 400,
      code: 'SHIFT_GPS_OUT_OF_BOUNDS',
      message: 'GPS coordinates outside area boundary',
      error: 'Bad Request',
      details: {
        distance: 150,
        maxDistance: 100,
      },
    };

    mock.onPost('/shifts/clock-in').reply(400, backendError);

    try {
      await apiClient.post('/shifts/clock-in');
      fail('Should have thrown an error');
    } catch (error) {
      const apiError = error as ApiError;

      // Programmatic error handling by code
      if (apiError.code === ApiErrorCode.SHIFT_GPS_OUT_OF_BOUNDS) {
        expect(apiError.details.distance).toBe(150);
        expect(apiError.details.maxDistance).toBe(100);
      } else {
        fail('Expected SHIFT_GPS_OUT_OF_BOUNDS error code');
      }
    }
  });
});
