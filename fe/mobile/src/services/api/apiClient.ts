/**
 * API Client
 * Axios HTTP client configuration with interceptors
 */

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from 'axios';
import config from '../../constants/config';
import { getToken, setToken, getRefreshToken, setRefreshToken, clearAll } from '../storage/secureStorage';
import type { ApiError, ApiResponse } from '../../types/api.types';
import { getErrorMessage } from '../../constants/errorCodes';

/**
 * Create and configure Axios instance
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Flag to prevent multiple simultaneous refresh attempts
 */
let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

/**
 * Subscriber timeout (30 seconds)
 * Increased from 10s to handle slow networks and prevent cascading auth failures
 */
const SUBSCRIBER_TIMEOUT = 30000;

/**
 * Add subscriber to wait for token refresh with timeout
 */
function subscribeTokenRefresh(callback: (token: string | null) => void): void {
  refreshSubscribers.push(callback);

  // Add timeout to prevent hanging indefinitely
  setTimeout(() => {
    const index = refreshSubscribers.indexOf(callback);
    if (index !== -1) {
      console.warn('[ApiClient] Token refresh subscriber timed out');
      refreshSubscribers.splice(index, 1);
      callback(null); // Notify with null to trigger error handling
    }
  }, SUBSCRIBER_TIMEOUT);
}

/**
 * Notify all subscribers that token has been refreshed
 */
function onTokenRefreshed(token: string | null): void {
  console.debug(`[ApiClient] Notifying ${refreshSubscribers.length} subscribers`);
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
}

/**
 * Attempt to refresh the access token
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    const response = await axios.post(`${config.API_BASE_URL}/auth/refresh`, {
      refresh_token: refreshToken,
    });

    if (response.data?.access_token) {
      const { access_token, refresh_token: newRefreshToken } = response.data;

      // Store new tokens
      await setToken(access_token);
      if (newRefreshToken) {
        await setRefreshToken(newRefreshToken);
      }

      return access_token;
    }

    return null;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

/**
 * Request interceptor to add JWT token
 */
apiClient.interceptors.request.use(
  async (requestConfig: AxiosRequestConfig) => {
    const token = await getToken();

    if (token && requestConfig.headers) {
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }

    if (__DEV__) {
      console.debug('🚀 API Request:', requestConfig.method?.toUpperCase(), requestConfig.url);
      console.debug('🚀 API Base URL:', requestConfig.baseURL || config.API_BASE_URL);
      console.debug('🚀 Full URL:', `${requestConfig.baseURL || config.API_BASE_URL}${requestConfig.url}`);
    }

    return requestConfig;
  },
  (error: AxiosError) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  },
);

/**
 * Response interceptor for error handling
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    if (__DEV__) {
      console.debug('✅ API Response:', response.config.url, response.status);
    }
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    if (__DEV__) {
      console.error('❌ API Error:', error.response?.status, error.response?.data);
      console.error('❌ Error Details:', {
        message: error.message,
        code: error.code,
        request: error.request ? 'Request made but no response' : 'No request made',
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method,
        },
      });
    }

    // Handle specific error cases
    if (error.response) {
      const errorCode = error.response.data?.code || 'UNKNOWN_ERROR';
      // For SHIFT_DURATION_TOO_SHORT, use actual minimumRequired from details (configurable per env)
      let localizedMessage: string;
      if (errorCode === 'SHIFT_DURATION_TOO_SHORT' && error.response.data?.details?.minimumRequired != null) {
        const min = error.response.data.details.minimumRequired;
        localizedMessage = `Durasi shift terlalu singkat. Minimal ${min} menit diperlukan sebelum Clock Out.`;
      } else {
        localizedMessage = getErrorMessage(errorCode, error.response.data?.message);
      }

      const apiError: ApiError = {
        status: error.response.status,
        code: errorCode,
        message: localizedMessage, // Indonesian user-friendly message
        error: error.response.data?.error,
        timestamp: error.response.data?.timestamp,
        path: error.response.data?.path,
        details: error.response.data?.details,
        errors: error.response.data?.errors, // Legacy validation errors
      };

      // Handle 401 Unauthorized (token expired)
      if (error.response.status === 401 && error.config) {
        const originalRequest = error.config as any;

        // Prevent infinite retry loop
        if (originalRequest._retry) {
          console.debug('🔒 Token refresh failed, clearing auth');
          await clearAll();
          return Promise.reject(apiError);
        }

        if (!isRefreshing) {
          isRefreshing = true;
          originalRequest._retry = true;

          try {
            const newToken = await refreshAccessToken();

            if (newToken) {
              console.debug('✅ Token refreshed successfully');
              isRefreshing = false;
              onTokenRefreshed(newToken);

              // Retry original request with new token
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
              return apiClient(originalRequest);
            } else {
              console.debug('❌ Token refresh failed, clearing auth');
              isRefreshing = false;
              onTokenRefreshed(null); // Notify all subscribers of failure
              await clearAll();
              return Promise.reject(apiError);
            }
          } catch (refreshError) {
            console.error('❌ Token refresh error:', refreshError);
            isRefreshing = false;
            onTokenRefreshed(null); // Notify all subscribers of failure
            await clearAll();
            return Promise.reject(apiError);
          }
        } else {
          // Wait for the current refresh to complete with timeout protection
          return new Promise((resolve, reject) => {
            subscribeTokenRefresh((token: string | null) => {
              if (!token) {
                // Refresh failed
                reject(apiError);
                return;
              }

              // Refresh succeeded, retry request
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(apiClient(originalRequest));
            });
          });
        }
      }

      return Promise.reject(apiError);
    }

    // Network error
    if (error.request) {
      const networkError: ApiError = {
        status: 0,
        code: 'NETWORK_ERROR',
        message: getErrorMessage('NETWORK_ERROR'),
      };
      return Promise.reject(networkError);
    }

    // Unknown error
    const unknownError: ApiError = {
      status: -1,
      code: 'UNKNOWN_ERROR',
      message: getErrorMessage('UNKNOWN_ERROR', error.message),
    };
    return Promise.reject(unknownError);
  },
);

/**
 * Generic GET request
 */
export async function get<T>(
  url: string,
  params?: Record<string, any>,
): Promise<ApiResponse<T>> {
  try {
    const response = await apiClient.get<T>(url, { params });
    return { data: response.data };
  } catch (error) {
    const e = error as ApiError;
    return { error: e.message, code: e.code };
  }
}

/**
 * Generic POST request
 */
export async function post<T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> {
  try {
    const response = await apiClient.post<T>(url, data, config);
    return { data: response.data };
  } catch (error) {
    const e = error as ApiError;
    return { error: e.message, code: e.code };
  }
}

/**
 * Generic PUT request
 */
export async function put<T>(
  url: string,
  data?: any,
): Promise<ApiResponse<T>> {
  try {
    const response = await apiClient.put<T>(url, data);
    return { data: response.data };
  } catch (error) {
    const e = error as ApiError;
    return { error: e.message, code: e.code };
  }
}

/**
 * Generic PATCH request
 */
export async function patch<T>(
  url: string,
  data?: any,
): Promise<ApiResponse<T>> {
  try {
    const response = await apiClient.patch<T>(url, data);
    return { data: response.data };
  } catch (error) {
    const e = error as ApiError;
    return { error: e.message, code: e.code };
  }
}

/**
 * Generic DELETE request
 */
export async function del<T>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await apiClient.delete<T>(url);
    return { data: response.data };
  } catch (error) {
    const e = error as ApiError;
    return { error: e.message, code: e.code };
  }
}

export default apiClient;

