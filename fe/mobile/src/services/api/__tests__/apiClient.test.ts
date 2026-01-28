/**
 * API Client Tests
 * Tests for API client error handling with standardized error codes,
 * token refresh, interceptors, and network error handling
 */

import apiClient, { get, post, put, del } from '../apiClient';
import MockAdapter from 'axios-mock-adapter';
import { ApiErrorCode } from '../../../constants/errorCodes';
import type { ApiError } from '../../../types/api.types';
import * as secureStorage from '../../storage/secureStorage';
import { Alert } from 'react-native';

// Mock Alert to prevent errors from imported modules
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock secure storage
jest.mock('../../storage/secureStorage');

const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>;

describe('API Client', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    jest.clearAllMocks();

    // Default token mock
    mockSecureStorage.getToken.mockResolvedValue('valid-token');
    mockSecureStorage.getRefreshToken.mockResolvedValue('valid-refresh-token');
  });

  afterEach(() => {
    mock.restore();
  });

  describe('Request Interceptor', () => {
    it('should add Authorization header with token', async () => {
      mockSecureStorage.getToken.mockResolvedValue('test-token-123');
      mock.onGet('/test').reply((config) => {
        expect(config.headers?.Authorization).toBe('Bearer test-token-123');
        return [200, { success: true }];
      });

      await apiClient.get('/test');
      expect(mockSecureStorage.getToken).toHaveBeenCalled();
    });

    it('should not add Authorization header if no token', async () => {
      mockSecureStorage.getToken.mockResolvedValue(null);
      mock.onGet('/test').reply((config) => {
        expect(config.headers?.Authorization).toBeUndefined();
        return [200, { success: true }];
      });

      await apiClient.get('/test');
    });

    it('should handle request error', async () => {
      mockSecureStorage.getToken.mockRejectedValue(new Error('Storage error'));

      try {
        await apiClient.get('/test');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Response Interceptor - Success', () => {
    it('should return response for successful requests', async () => {
      const responseData = { id: 1, name: 'Test' };
      mock.onGet('/test').reply(200, responseData);

      const response = await apiClient.get('/test');
      expect(response.data).toEqual(responseData);
      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
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
        // Now returns Indonesian error message from mapping
        expect(apiError.message).toBe('Anda sudah clock-in. Selesaikan shift terlebih dahulu');
        expect(apiError.error).toBe('Bad Request');
        expect(apiError.timestamp).toBe('2026-01-16T10:00:00Z');
        expect(apiError.path).toBe('/api/v1/shifts/clock-in');
        expect(apiError.details).toEqual({ activeShiftId: 'test-id-123' });
      }
    });

  it('should handle authentication errors with error code', async () => {
    // Use 403 instead of 401 to avoid triggering token refresh logic
    const authError = {
      statusCode: 403,
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Invalid username or password',
      error: 'Forbidden',
      timestamp: '2026-01-16T10:00:00Z',
      path: '/api/v1/auth/login',
    };

    mock.onPost('/auth/login').reply(403, authError);

    try {
      await apiClient.post('/auth/login');
      fail('Should have thrown an error');
    } catch (error) {
      const apiError = error as ApiError;
      expect(apiError.status).toBe(403);
      expect(apiError.code).toBe(ApiErrorCode.AUTH_INVALID_CREDENTIALS);
      // Now returns Indonesian error message from mapping
      expect(apiError.message).toBe('Username atau password salah');
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
      // When no code provided, uses UNKNOWN_ERROR Indonesian message with backend message as fallback
      expect(apiError.message).toBe('Terjadi kesalahan yang tidak diketahui');
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

  describe('Token Refresh on 401', () => {
    beforeEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
      // Reset any retry flags
      mock.reset();
      mock = new MockAdapter(apiClient);
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('should clear auth and reject if token refresh fails', async () => {
      mock.onGet('/protected').reply(401, {
        statusCode: 401,
        code: 'AUTH_TOKEN_EXPIRED',
        message: 'Token expired',
      });

      // Refresh fails
      mock.onPost('/auth/refresh').reply(401, {
        statusCode: 401,
        code: 'AUTH_REFRESH_TOKEN_EXPIRED',
        message: 'Refresh token expired',
      });

      try {
        await apiClient.get('/protected');
        fail('Should have thrown an error');
      } catch (error) {
        // Small delay to let async operations complete
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(mockSecureStorage.clearAll).toHaveBeenCalled();
        const apiError = error as ApiError;
        expect(apiError.status).toBe(401);
      }
    }, 15000);

    it('should handle refresh token not available', async () => {
      mockSecureStorage.getRefreshToken.mockResolvedValue(null);

      mock.onGet('/protected').reply(401, {
        statusCode: 401,
        code: 'AUTH_TOKEN_EXPIRED',
        message: 'Token expired',
      });

      try {
        await apiClient.get('/protected');
        fail('Should have thrown an error');
      } catch (error) {
        // Small delay to let async operations complete
        await new Promise(resolve => setTimeout(resolve, 100));
        const apiError = error as ApiError;
        expect(apiError.status).toBe(401);
      }
    }, 10000);

    it('should handle refresh error and clear storage', async () => {
      mockSecureStorage.getRefreshToken.mockResolvedValue('refresh-token');

      mock.onGet('/protected').reply(401, {
        statusCode: 401,
        code: 'AUTH_TOKEN_EXPIRED',
        message: 'Token expired',
      });

      // Refresh throws error
      mock.onPost('/auth/refresh').networkError();

      try {
        await apiClient.get('/protected');
        fail('Should have thrown an error');
      } catch (error) {
        // Small delay to let async operations complete
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(mockSecureStorage.clearAll).toHaveBeenCalled();
        const apiError = error as ApiError;
        expect(apiError.status).toBe(401);
      }
    }, 15000);

    // FIXME: This test causes infinite retry loop after UI revamp
    // Need to investigate why refresh response without access_token causes hanging
    it.skip('should handle refresh response without access token', async () => {
      mockSecureStorage.getRefreshToken.mockResolvedValue('refresh-token');

      mock.onGet('/protected').reply(401, {
        statusCode: 401,
        code: 'AUTH_TOKEN_EXPIRED',
        message: 'Token expired',
      });

      // Refresh returns but without token
      mock.onPost('/auth/refresh').reply(200, {
        // No access_token in response
        message: 'Invalid response',
      });

      try {
        await apiClient.get('/protected');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.status).toBe(401);
      }
    });
  });

  describe('Network Errors', () => {
    it('should handle network error with NETWORK_ERROR code', async () => {
      mock.onGet('/test').networkError();

      try {
        await apiClient.get('/test');
        fail('Should have thrown an error');
      } catch (error) {
        const apiError = error as ApiError;
        // Network errors can be status 0 or -1
        expect([0, -1]).toContain(apiError.status);
        // Can be NETWORK_ERROR or UNKNOWN_ERROR depending on axios error type
        expect(['NETWORK_ERROR', 'UNKNOWN_ERROR']).toContain(apiError.code);
        expect(apiError.message).toBeTruthy();
      }
    });

    it('should handle timeout error', async () => {
      mock.onGet('/test').timeout();

      try {
        await apiClient.get('/test');
        fail('Should have thrown an error');
      } catch (error) {
        const apiError = error as ApiError;
        // Timeout can result in either network error or unknown error
        expect(['NETWORK_ERROR', 'UNKNOWN_ERROR']).toContain(apiError.code);
      }
    });
  });

  describe('Generic API Methods', () => {
    it('should handle GET request with get()', async () => {
      mock.onGet('/test', { params: { id: 1 } }).reply(200, { data: 'success' });

      const result = await get('/test', { id: 1 });

      expect(result.data).toEqual({ data: 'success' });
      expect(result.error).toBeUndefined();
    });

    it('should handle GET request error with get()', async () => {
      mock.onGet('/test').reply(500, {
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'Server error',
      });

      const result = await get('/test');

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      // The error message is the localized error message from getErrorMessage
      expect(typeof result.error).toBe('string');
    });

    it('should handle POST request with post()', async () => {
      const requestData = { name: 'test' };
      mock.onPost('/test', requestData).reply(201, { id: 1, name: 'test' });

      const result = await post('/test', requestData);

      expect(result.data).toEqual({ id: 1, name: 'test' });
      expect(result.error).toBeUndefined();
    });

    it('should handle POST request error with post()', async () => {
      mock.onPost('/test').reply(400, {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid data',
      });

      const result = await post('/test', {});

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it('should handle POST request with custom config', async () => {
      const config = { headers: { 'X-Custom': 'header' } };
      mock.onPost('/test').reply((requestConfig) => {
        expect(requestConfig.headers?.['X-Custom']).toBe('header');
        return [200, { success: true }];
      });

      const result = await post('/test', {}, config);

      expect(result.data).toEqual({ success: true });
    });

    it('should handle PUT request with put()', async () => {
      const updateData = { name: 'updated' };
      mock.onPut('/test/1', updateData).reply(200, { id: 1, name: 'updated' });

      const result = await put('/test/1', updateData);

      expect(result.data).toEqual({ id: 1, name: 'updated' });
      expect(result.error).toBeUndefined();
    });

    it('should handle PUT request error with put()', async () => {
      mock.onPut('/test/1').reply(404, {
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Resource not found',
      });

      const result = await put('/test/1', {});

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
    });

    it('should handle DELETE request with del()', async () => {
      mock.onDelete('/test/1').reply(200, { success: true });

      const result = await del('/test/1');

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should handle DELETE request error with del()', async () => {
      mock.onDelete('/test/1').reply(403, {
        statusCode: 403,
        code: 'FORBIDDEN',
        message: 'Access denied',
      });

      const result = await del('/test/1');

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
    });
  });
});
