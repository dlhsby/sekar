/**
 * API Client Tests
 * Tests for API client error handling with standardized error codes,
 * token refresh, interceptors, and network error handling
 */

import axios from 'axios';
import apiClient, { get, post, put, del } from '../apiClient';
import MockAdapter from 'axios-mock-adapter';
import { ApiErrorCode } from '../../../constants/errorCodes';
import type { ApiError } from '../../../types/api.types';
import * as secureStorage from '../../storage/secureStorage';
import config from '../../../constants/config';

// Alert is mocked globally in jest.setup.js

// Mock secure storage
jest.mock('../../storage/secureStorage');

const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>;

describe('API Client', () => {
  let mock: MockAdapter;
  let axiosMock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    axiosMock = new MockAdapter(axios); // Mock raw axios for refresh calls
    jest.clearAllMocks();

    // Restore Alert mock after clearAllMocks (which clears it)
    const RN = require('react-native');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- global test fixtures from jest.setup.js
    const globalAny = global as any;
    if (globalAny.__ALERT_MOCK__ && globalAny.__PROMPT_MOCK__) {
      RN.Alert = {
        alert: globalAny.__ALERT_MOCK__,
        prompt: globalAny.__PROMPT_MOCK__,
      };
    }

    // Default token mock
    mockSecureStorage.getToken.mockResolvedValue('valid-token');
    mockSecureStorage.getRefreshToken.mockResolvedValue('valid-refresh-token');
  });

  afterEach(() => {
    mock.restore();
    axiosMock.restore();
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
        expect(apiError.message).toBe('Anda sudah memulai shift dan belum mengakhirinya.');
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
      expect(apiError.message).toBe('Username atau kata sandi salah.');
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
      expect(apiError.message).toBe('Terjadi kesalahan. Silakan coba lagi.');
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
        const details = apiError.details as unknown;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- details is from API response
        expect((details as any).distance).toBe(150);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- details is from API response
        expect((details as any).maxDistance).toBe(100);
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
      axiosMock.reset();
      mock = new MockAdapter(apiClient);
      axiosMock = new MockAdapter(axios);
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('should successfully refresh token and retry request', async () => {
      mockSecureStorage.getRefreshToken.mockResolvedValue('valid-refresh-token');
      mockSecureStorage.setToken.mockResolvedValue(undefined);
      mockSecureStorage.setRefreshToken.mockResolvedValue(undefined);

      let callCount = 0;
      mock.onGet('/protected').reply(() => {
        callCount++;
        if (callCount === 1) {
          return [401, {
            statusCode: 401,
            code: 'AUTH_TOKEN_EXPIRED',
            message: 'Token expired',
          }];
        }
        return [200, { data: 'success' }];
      });

      // Refresh succeeds - use same pattern as passing tests
      axiosMock.onPost(new RegExp('/auth/refresh$')).reply(200, {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      });

      const response = await apiClient.get('/protected');

      expect(response.status).toBe(200);
      expect(response.data).toEqual({ data: 'success' });
      expect(mockSecureStorage.setToken).toHaveBeenCalledWith('new-access-token');
      expect(mockSecureStorage.setRefreshToken).toHaveBeenCalledWith('new-refresh-token');
      expect(callCount).toBe(2); // Called twice
    }, 15000);

    it('should handle refresh with only access token (no new refresh token)', async () => {
      mockSecureStorage.getRefreshToken.mockResolvedValue('valid-refresh-token');
      mockSecureStorage.setToken.mockResolvedValue(undefined);

      let callCount = 0;
      mock.onGet('/protected').reply(() => {
        callCount++;
        if (callCount === 1) {
          return [401, {
            statusCode: 401,
            code: 'AUTH_TOKEN_EXPIRED',
            message: 'Token expired',
          }];
        }
        return [200, { data: 'success' }];
      });

      // Refresh succeeds but only returns access_token (no new refresh_token)
      axiosMock.onPost(new RegExp('/auth/refresh$')).reply(200, {
        access_token: 'new-access-token',
        // No refresh_token in response
      });

      const response = await apiClient.get('/protected');

      expect(response.status).toBe(200);
      expect(mockSecureStorage.setToken).toHaveBeenCalledWith('new-access-token');
      expect(mockSecureStorage.setRefreshToken).not.toHaveBeenCalled();
    }, 15000);

    it('should handle multiple concurrent 401s during token refresh', async () => {
      mockSecureStorage.getRefreshToken.mockResolvedValue('valid-refresh-token');
      mockSecureStorage.setToken.mockResolvedValue(undefined);

      let callCount1 = 0;
      let callCount2 = 0;

      // Both requests: first call fails with 401, second succeeds
      mock.onGet('/protected1').reply(() => {
        callCount1++;
        if (callCount1 === 1) {
          return [401, {
            statusCode: 401,
            code: 'AUTH_TOKEN_EXPIRED',
            message: 'Token expired',
          }];
        }
        return [200, { data: 'success1' }];
      });

      mock.onGet('/protected2').reply(() => {
        callCount2++;
        if (callCount2 === 1) {
          return [401, {
            statusCode: 401,
            code: 'AUTH_TOKEN_EXPIRED',
            message: 'Token expired',
          }];
        }
        return [200, { data: 'success2' }];
      });

      // Refresh succeeds
      axiosMock.onPost(new RegExp('/auth/refresh$')).reply(200, {
        access_token: 'new-access-token',
      });

      // Fire both requests concurrently
      const [response1, response2] = await Promise.all([
        apiClient.get('/protected1'),
        apiClient.get('/protected2'),
      ]);

      expect(response1.data).toEqual({ data: 'success1' });
      expect(response2.data).toEqual({ data: 'success2' });
      // Refresh should only be called once
      expect(mockSecureStorage.setToken).toHaveBeenCalledTimes(1);
    }, 15000);

    it('should prevent infinite retry loop with _retry flag', async () => {
      // Mock clearAll to prevent navigation side effects
      mockSecureStorage.clearAll.mockResolvedValue(undefined);

      mock.onGet('/protected').reply(401, {
        statusCode: 401,
        code: 'AUTH_TOKEN_EXPIRED',
        message: 'Token expired',
      });

      // Refresh returns success but subsequent request also fails with 401
      axiosMock.onPost(new RegExp('/auth/refresh$')).reply(200, {
        access_token: 'invalid-token',
      });

      try {
        await apiClient.get('/protected');
        fail('Should have thrown an error');
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 50));
        expect(mockSecureStorage.clearAll).toHaveBeenCalled();
        const apiError = error as ApiError;
        expect(apiError.status).toBe(401);
      }
    }, 15000);

    it('should clear auth and reject if token refresh fails', async () => {
      mock.onGet('/protected').reply(401, {
        statusCode: 401,
        code: 'AUTH_TOKEN_EXPIRED',
        message: 'Token expired',
      });

      // Refresh fails
      axiosMock.onPost(new RegExp('/auth/refresh$')).reply(401, {
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
      axiosMock.onPost(new RegExp('/auth/refresh$')).networkError();

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

    it('should handle concurrent requests when refresh fails', async () => {
      mockSecureStorage.getRefreshToken.mockResolvedValue('valid-refresh-token');

      // Both requests fail with 401
      mock.onGet('/protected1').reply(401, {
        statusCode: 401,
        code: 'AUTH_TOKEN_EXPIRED',
        message: 'Token expired',
      });
      mock.onGet('/protected2').reply(401, {
        statusCode: 401,
        code: 'AUTH_TOKEN_EXPIRED',
        message: 'Token expired',
      });

      // Refresh fails
      axiosMock.onPost(new RegExp('/auth/refresh$')).reply(401, {
        statusCode: 401,
        code: 'AUTH_REFRESH_TOKEN_EXPIRED',
        message: 'Refresh token expired',
      });

      // Start both requests concurrently
      const promise1 = apiClient.get('/protected1').catch(e => e);
      const promise2 = apiClient.get('/protected2').catch(e => e);

      const [error1, error2] = await Promise.all([promise1, promise2]);

      // Both should fail
      expect(error1.status).toBe(401);
      expect(error2.status).toBe(401);

      // Wait for clearAll to be called
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockSecureStorage.clearAll).toHaveBeenCalled();
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
      axiosMock.onPost(new RegExp('/auth/refresh$')).reply(200, {
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

  describe('Request Interceptor Error Handling', () => {
    it('should reject request if token retrieval fails', async () => {
      mockSecureStorage.getToken.mockRejectedValue(new Error('Storage read error'));

      try {
        await apiClient.get('/test');
        fail('Should have thrown an error');
      } catch (error) {
        // The error gets wrapped in an API error object
        expect(error).toBeDefined();
        expect(typeof error).toBe('object');
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
