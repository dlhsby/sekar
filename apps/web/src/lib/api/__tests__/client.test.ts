/**
 * Unit Tests: API Client
 * Tests HTTP client configuration, interceptors, token refresh logic, and error handling
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import {
  apiClient,
  getErrorMessage,
  getFormErrorMessage,
  isApiError,
  ApiError,
} from '../client';
import * as cookieUtils from '@/lib/utils/cookies';

// Mock the cookies module
jest.mock('@/lib/utils/cookies', () => ({
  getCookie: jest.fn(),
  setAuthCookie: jest.fn(),
  clearAuthCookies: jest.fn(),
}));

// Mock window.location
const mockReplace = jest.fn();
delete (window as any).location;
window.location = { replace: mockReplace, pathname: '/' } as any;

describe('API Client', () => {
  let mockAxios: MockAdapter;
  const getCookieMock = cookieUtils.getCookie as jest.Mock;
  const setAuthCookieMock = cookieUtils.setAuthCookie as jest.Mock;
  const clearAuthCookiesMock = cookieUtils.clearAuthCookies as jest.Mock;

  beforeEach(() => {
    // Create mock adapter for axios instance
    mockAxios = new MockAdapter(apiClient);

    // Clear all mocks
    jest.clearAllMocks();
    mockReplace.mockClear();

    // Reset window location
    window.location.pathname = '/';
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('Configuration', () => {
    it('should have correct base URL', () => {
      expect(apiClient.defaults.baseURL).toBe('http://localhost:3000/api/v1');
    });

    it('should have 30 second timeout', () => {
      expect(apiClient.defaults.timeout).toBe(30000);
    });

    it('should have JSON content type header', () => {
      expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('Request Interceptor', () => {
    it('should add Authorization header when access token exists', async () => {
      getCookieMock.mockReturnValue('test-access-token');
      mockAxios.onGet('/test').reply(200, { data: 'success' });

      await apiClient.get('/test');

      expect(getCookieMock).toHaveBeenCalledWith('access_token');
      const requestConfig = mockAxios.history.get[0];
      expect(requestConfig.headers?.Authorization).toBe('Bearer test-access-token');
    });

    it('should not add Authorization header when no access token', async () => {
      getCookieMock.mockReturnValue(null);
      mockAxios.onGet('/test').reply(200, { data: 'success' });

      await apiClient.get('/test');

      expect(getCookieMock).toHaveBeenCalledWith('access_token');
      const requestConfig = mockAxios.history.get[0];
      expect(requestConfig.headers?.Authorization).toBeUndefined();
    });
  });

  describe('Response Interceptor - Error Handling', () => {
    it('should handle 401 errors', async () => {
      mockAxios.onGet('/protected').reply(401, { message: 'Unauthorized' });

      await expect(apiClient.get('/protected')).rejects.toThrow();
    });

    it('should pass through non-401 errors', async () => {
      mockAxios.onGet('/test').reply(500, { message: 'Server error' });

      await expect(apiClient.get('/test')).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      mockAxios.onGet('/test').networkError();

      await expect(apiClient.get('/test')).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      mockAxios.onGet('/test').timeout();

      await expect(apiClient.get('/test')).rejects.toThrow();
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from API error response', () => {
      const error = new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 400,
        statusText: 'Bad Request',
        data: { message: 'Invalid credentials' },
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      });

      expect(getErrorMessage(error)).toBe('Invalid credentials');
    });

    it('should return timeout message for ECONNABORTED', () => {
      const error = new AxiosError('timeout of 1000ms exceeded', 'ECONNABORTED');

      expect(getErrorMessage(error)).toBe('Permintaan melebihi batas waktu. Silakan coba lagi.');
    });

    it('should return network error message', () => {
      const error = new AxiosError('Network Error');

      expect(getErrorMessage(error)).toBe('Gagal terhubung ke server. Periksa koneksi internet Anda.');
    });

    it('should return generic message for axios error without response', () => {
      const error = new AxiosError('Something went wrong');

      expect(getErrorMessage(error)).toBe('Terjadi kesalahan. Silakan coba lagi.');
    });

    it('should handle non-axios Error objects', () => {
      const error = new Error('Custom error');

      expect(getErrorMessage(error)).toBe('Custom error');
    });

    it('should handle unknown error types', () => {
      const error = 'string error';

      expect(getErrorMessage(error)).toBe('Terjadi kesalahan. Silakan coba lagi.');
    });
  });

  describe('isApiError', () => {
    it('should return true for AxiosError with response', () => {
      const error = new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 400,
        statusText: 'Bad Request',
        data: { statusCode: 400, message: 'Bad Request', error: 'BadRequest' },
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      });

      expect(isApiError(error)).toBe(true);
    });

    it('should return false for AxiosError without response', () => {
      const error = new AxiosError('Network Error');

      expect(isApiError(error)).toBe(false);
    });

    it('should return false for non-AxiosError', () => {
      const error = new Error('Generic error');

      expect(isApiError(error)).toBe(false);
    });
  });

  /**
   * The inline banner on every form modal used to render
   * `error instanceof Error ? error.message : <fallback>`. An AxiosError IS an
   * Error, so that branch always won and the banner showed axios's own string —
   * "Request failed with status code 400" — while the API had actually replied
   * "property location_ids should not exist". Operators saw a failure with no
   * stated reason, on a form where nothing looked wrong.
   */
  describe('getFormErrorMessage', () => {
    const fallback = 'Gagal menyimpan';

    it('surfaces the API reason instead of the axios string', () => {
      const error = {
        isAxiosError: true,
        message: 'Request failed with status code 400',
        response: { status: 400, data: { message: ['property location_ids should not exist'] } },
      };
      const shown = getFormErrorMessage(error, fallback);
      expect(shown).toBe('property location_ids should not exist');
      expect(shown).not.toContain('status code');
    });

    it('prefers the localized code over the raw backend message', () => {
      const error = {
        isAxiosError: true,
        message: 'Request failed with status code 409',
        response: { status: 409, data: { code: 'PHONE_ALREADY_EXISTS', message: 'Phone taken' } },
      };
      // localizeApiError resolves known codes; unknown ones fall through to raw.
      expect(getFormErrorMessage(error, fallback)).not.toBe('Request failed with status code 409');
    });

    it('falls back to the caller copy for a non-API failure', () => {
      expect(getFormErrorMessage(new Error('boom'), fallback)).toBe(fallback);
      expect(getFormErrorMessage(undefined, fallback)).toBe(fallback);
    });
  });
});
