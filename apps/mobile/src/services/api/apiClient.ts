/**
 * API Client
 * Axios HTTP client configuration with interceptors
 */

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosError,
} from 'axios';
import i18n from '../../i18n/config';
import config from '../../constants/config';
import { getToken, setToken, getRefreshToken, setRefreshToken, clearAll } from '../storage/secureStorage';
import { emitSessionExpired } from '../auth/sessionEvents';
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
 * The outcome of a refresh attempt.
 *
 * `rejected` and `unavailable` are NOT the same event, and collapsing them into
 * a single null - as this function used to - is what made a flaky connection
 * indistinguishable from a dead session. A field worker in a basement or under
 * canopy would have been logged out and lost their shift context because a
 * request timed out.
 */
type RefreshOutcome =
  /** The server issued a new token. */
  | { status: 'refreshed'; token: string }
  /** The server refused the refresh token. The session is genuinely over. */
  | { status: 'rejected' }
  /** We never got an answer. Keep the credentials and try again later. */
  | { status: 'unavailable' };

/**
 * Attempt to refresh the access token.
 */
async function refreshAccessToken(): Promise<RefreshOutcome> {
  const refreshToken = await getRefreshToken().catch(() => null);
  if (!refreshToken) {
    // Nothing to refresh WITH. There is no server to ask, so this is terminal.
    return { status: 'rejected' };
  }

  try {
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

      return { status: 'refreshed', token: access_token };
    }

    // A 200 with no token is a broken contract, not a refusal — but there is
    // no token to continue with either.
    return { status: 'rejected' };
  } catch (error) {
    const axiosError = error as AxiosError;
    // A RESPONSE means the server answered and said no. No response at all
    // (timeout, DNS, aeroplane mode) means we simply could not ask.
    if (!axiosError.response) {
      console.warn('[ApiClient] Token refresh unreachable, keeping session:', axiosError.message);
      return { status: 'unavailable' };
    }
    console.error('[ApiClient] Token refresh rejected:', axiosError.response.status);
    return { status: 'rejected' };
  }
}

/**
 * Tear down a session the server will no longer accept: drop the credentials
 * and tell the app, which stops tracking and returns to the login screen.
 *
 * The queue is deliberately NOT touched. A forced logout arrives mid-shift with
 * no chance to sync, so anything already captured has to survive it - the
 * voluntary logout path clears the queue only after offering to sync it first.
 */
async function endSession(reason: 'refresh_rejected' | 'retry_exhausted'): Promise<void> {
  await clearAll();
  emitSessionExpired(reason);
}

/**
 * Request interceptor to add JWT token
 */
apiClient.interceptors.request.use(
  async (requestConfig: InternalAxiosRequestConfig) => {
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
      if (errorCode === 'SHIFT_DURATION_TOO_SHORT' && (error.response.data?.details as any)?.minimumRequired != null) {
        const min = (error.response.data.details as any).minimumRequired;
        localizedMessage = i18n.t('errors:SHIFT_DURATION_TOO_SHORT', { minutes: min });
      } else {
        // May 13 — NestJS ValidationPipe returns `message` as a string[]
        // of class-validator failures. Previously the array was passed as
        // `defaultMessage` and silently swallowed (defaultMessage is only
        // used when the code isn't mapped) -> user got the generic
        // "Permintaan tidak valid" toast instead of the actual field
        // error. Join the array into a readable list so the form-level
        // toast tells the user WHICH field needs fixing.
        const rawMessage = error.response.data?.message;
        const flatMessage = Array.isArray(rawMessage)
          ? rawMessage.join('. ')
          : (rawMessage as string | undefined);
        localizedMessage =
          errorCode === 'BAD_REQUEST' && flatMessage
            ? flatMessage
            : getErrorMessage(errorCode, flatMessage);
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

        // Prevent infinite retry loop. A request that 401s again with a token
        // we just minted is not a refresh problem — the session is finished.
        if (originalRequest._retry) {
          console.debug('🔒 Retried request still unauthorized, ending session');
          await endSession('retry_exhausted');
          return Promise.reject(apiError);
        }

        if (!isRefreshing) {
          isRefreshing = true;
          originalRequest._retry = true;

          try {
            const outcome = await refreshAccessToken();
            isRefreshing = false;

            if (outcome.status === 'refreshed') {
              console.debug('✅ Token refreshed successfully');
              onTokenRefreshed(outcome.token);

              // Retry original request with new token
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${outcome.token}`;
              }
              return apiClient(originalRequest);
            }

            onTokenRefreshed(null); // Notify all subscribers of failure

            if (outcome.status === 'unavailable') {
              // We could not REACH the server to ask. Keep the credentials and
              // report it as what it is, so the caller queues the work offline
              // instead of the worker being signed out by a bad signal.
              console.warn('📴 Refresh unreachable — keeping session for retry');
              return Promise.reject({
                status: 0,
                code: 'NETWORK_ERROR',
                message: getErrorMessage('NETWORK_ERROR'),
              } as ApiError);
            }

            console.debug('❌ Refresh token rejected, ending session');
            await endSession('refresh_rejected');
            return Promise.reject(apiError);
          } catch (refreshError) {
            // `refreshAccessToken` handles its own errors; reaching here means
            // storage failed, which leaves us unable to prove a session exists.
            console.error('❌ Token refresh error:', refreshError);
            isRefreshing = false;
            onTokenRefreshed(null);
            await endSession('refresh_rejected');
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

