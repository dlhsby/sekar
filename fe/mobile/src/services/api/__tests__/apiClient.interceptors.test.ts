/**
 * API Client Interceptors Tests
 * Targeted tests for request/response interceptors to cover uncovered lines
 */

import apiClient from '../apiClient';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import type { ApiError } from '../../../types/api.types';
import * as secureStorage from '../../storage/secureStorage';
import { Alert } from 'react-native';

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock secure storage
jest.mock('../../storage/secureStorage');

const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>;

describe('API Client - Interceptors Coverage', () => {
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

  describe('Request Interceptor - Token Handling', () => {
    it('should add token to request headers when token exists', async () => {
      mockSecureStorage.getToken.mockResolvedValue('test-token-123');

      let capturedHeaders: any;
      mock.onGet('/test').reply((config) => {
        capturedHeaders = config.headers;
        return [200, { success: true }];
      });

      await apiClient.get('/test');

      expect(capturedHeaders.Authorization).toBe('Bearer test-token-123');
    });

    it('should not add Authorization header when no token', async () => {
      mockSecureStorage.getToken.mockResolvedValue(null);

      let capturedHeaders: any;
      mock.onGet('/test').reply((config) => {
        capturedHeaders = config.headers;
        return [200, { success: true }];
      });

      await apiClient.get('/test');

      expect(capturedHeaders.Authorization).toBeUndefined();
    });

    it('should not add Authorization header when empty token', async () => {
      mockSecureStorage.getToken.mockResolvedValue('');

      let capturedHeaders: any;
      mock.onGet('/test').reply((config) => {
        capturedHeaders = config.headers;
        return [200, { success: true }];
      });

      await apiClient.get('/test');

      expect(capturedHeaders.Authorization).toBeUndefined();
    });
  });

  describe('Response Interceptor - Token Refresh Edge Cases', () => {
    it('should handle 401 with no refresh token available', async () => {
      mock.onGet('/protected').reply(401, {
        code: 'TOKEN_EXPIRED',
        message: 'Token expired',
      });

      mockSecureStorage.getRefreshToken.mockResolvedValue(null);

      try {
        await apiClient.get('/protected');
        fail('Should have thrown an error');
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.code).toBe('TOKEN_EXPIRED');
        expect(mockSecureStorage.clearAll).toHaveBeenCalled();
      }
    });

    it('should handle 401 when refresh endpoint returns empty response', async () => {
      mock.onGet('/protected').reply(401, {
        code: 'TOKEN_EXPIRED',
        message: 'Token expired',
      });

      const refreshMock = new MockAdapter(axios);
      refreshMock.onPost('/api/v1/auth/refresh').reply(200, null);

      mockSecureStorage.getRefreshToken.mockResolvedValue('valid-refresh-token');

      try {
        await apiClient.get('/protected');
        fail('Should have thrown an error');
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.code).toBe('TOKEN_EXPIRED');
        expect(mockSecureStorage.clearAll).toHaveBeenCalled();
      }

      refreshMock.restore();
    });

    it('should handle 401 when refresh endpoint throws error', async () => {
      mock.onGet('/protected').reply(401, {
        code: 'TOKEN_EXPIRED',
        message: 'Token expired',
      });

      const refreshMock = new MockAdapter(axios);
      refreshMock.onPost('/api/v1/auth/refresh').networkError();

      mockSecureStorage.getRefreshToken.mockResolvedValue('valid-refresh-token');

      try {
        await apiClient.get('/protected');
        fail('Should have thrown an error');
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.code).toBe('TOKEN_EXPIRED');
        expect(mockSecureStorage.clearAll).toHaveBeenCalled();
      }

      refreshMock.restore();
    });

    // Token refresh success flow is tested in main apiClient.test.ts
    it.skip('token refresh header update is tested in main test suite', () => {
      // This complex scenario is already covered in apiClient.test.ts
    });
  });

  describe('Error Handling - Edge Cases', () => {
    it('should handle error with all details fields', async () => {
      const fullError = {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        error: 'Bad Request',
        timestamp: '2026-01-31T00:00:00Z',
        path: '/api/v1/test',
        details: { field: 'name', issue: 'required' },
        errors: [{ field: 'name', message: 'Name is required' }],
      };

      mock.onPost('/test').reply(400, fullError);

      try {
        await apiClient.post('/test');
        fail('Should have thrown an error');
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.code).toBe('VALIDATION_ERROR');
        expect(apiError.message).toBeDefined();
        expect(apiError.status).toBe(400);
        expect(apiError.error).toBe('Bad Request');
        expect(apiError.timestamp).toBe('2026-01-31T00:00:00Z');
        expect(apiError.path).toBe('/api/v1/test');
        expect(apiError.details).toEqual({ field: 'name', issue: 'required' });
        expect(apiError.errors).toEqual([{ field: 'name', message: 'Name is required' }]);
      }
    });

    it('should handle error with unknown code', async () => {
      mock.onGet('/test').reply(500, {
        code: 'SOME_UNKNOWN_ERROR_CODE',
        message: 'Something went wrong',
      });

      try {
        await apiClient.get('/test');
        fail('Should have thrown an error');
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.code).toBe('SOME_UNKNOWN_ERROR_CODE');
        expect(apiError.message).toBeDefined(); // Should use fallback message
      }
    });

    it('should handle 403 Forbidden error', async () => {
      mock.onGet('/forbidden').reply(403, {
        code: 'FORBIDDEN',
        message: 'Access denied',
      });

      try {
        await apiClient.get('/forbidden');
        fail('Should have thrown an error');
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.status).toBe(403);
        expect(apiError.code).toBe('FORBIDDEN');
      }
    });

    it('should handle 404 Not Found error', async () => {
      mock.onGet('/notfound').reply(404, {
        code: 'NOT_FOUND',
        message: 'Resource not found',
      });

      try {
        await apiClient.get('/notfound');
        fail('Should have thrown an error');
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.status).toBe(404);
        expect(apiError.code).toBe('NOT_FOUND');
      }
    });

    it('should handle 500 Internal Server Error', async () => {
      mock.onGet('/error').reply(500, {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Server error occurred',
      });

      try {
        await apiClient.get('/error');
        fail('Should have thrown an error');
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.status).toBe(500);
        expect(apiError.code).toBe('INTERNAL_SERVER_ERROR');
      }
    });

    it('should handle 503 Service Unavailable error', async () => {
      mock.onGet('/unavailable').reply(503, {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service is temporarily unavailable',
      });

      try {
        await apiClient.get('/unavailable');
        fail('Should have thrown an error');
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.status).toBe(503);
        expect(apiError.code).toBe('SERVICE_UNAVAILABLE');
      }
    });
  });

  describe('Request Configuration', () => {
    it('should handle POST request with custom config', async () => {
      mock.onPost('/upload').reply(200, { success: true });

      const result = await apiClient.post('/upload', { data: 'test' }, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });

      expect(result.data).toEqual({ success: true });
    });

    it('should handle request with query parameters', async () => {
      mock.onGet('/search').reply((config) => {
        expect(config.params).toEqual({ q: 'test', limit: 10 });
        return [200, { results: [] }];
      });

      await apiClient.get('/search', { params: { q: 'test', limit: 10 } });
    });
  });

  describe('Response Success', () => {
    it('should return successful response data', async () => {
      const responseData = { id: 1, name: 'Test' };
      mock.onGet('/data').reply(200, responseData);

      const response = await apiClient.get('/data');

      expect(response.status).toBe(200);
      expect(response.data).toEqual(responseData);
    });

    it('should handle 201 Created response', async () => {
      const created = { id: 1, created: true };
      mock.onPost('/create').reply(201, created);

      const response = await apiClient.post('/create', {});

      expect(response.status).toBe(201);
      expect(response.data).toEqual(created);
    });

    it('should handle 204 No Content response', async () => {
      mock.onDelete('/delete').reply(204);

      const response = await apiClient.delete('/delete');

      expect(response.status).toBe(204);
    });
  });
});
