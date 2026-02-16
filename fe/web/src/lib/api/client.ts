import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { clearAuthCookies, getCookie, setAuthCookie } from '@/lib/utils/cookies';
import type { User } from '@/types/models';

/**
 * API Client for SEKAR Backend
 * Handles authentication, token refresh, and error handling
 */

const API_BASE_URL = (() => {
  const url = process.env.NEXT_PUBLIC_API_URL;

  // Only validate during runtime in production (not build time)
  // Check if we're in a browser or server-side during actual request
  if (
    !url &&
    process.env.NODE_ENV === 'production' &&
    typeof window !== 'undefined' // Only check in browser, not during SSG build
  ) {
    console.error(
      'NEXT_PUBLIC_API_URL is not set in production. ' +
      'Please set it in your .env.production file. ' +
      'Falling back to localhost (API calls will fail).'
    );
  }

  return url || 'http://localhost:3000/api/v1';
})();

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track if we're currently refreshing to prevent multiple refresh calls
let isRefreshing = false;
// Track if we're currently redirecting to prevent multiple redirects
let isRedirecting = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

/**
 * Check if we're currently on the login page
 * Prevents redirect loops when already on login
 */
const isOnLoginPage = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.location.pathname === '/login' || window.location.pathname.startsWith('/login');
};

/**
 * Safely redirect to login page
 * Prevents multiple redirects and redirect loops
 */
const redirectToLogin = (): void => {
  if (typeof window === 'undefined') return;
  if (isRedirecting) return;
  if (isOnLoginPage()) return;

  isRedirecting = true;
  clearAuthCookies();
  // Use replace to avoid creating history entry (back button won't loop)
  window.location.replace('/login');
};

/**
 * Process queued requests after token refresh
 */
const processQueue = (error: Error | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });

  failedQueue = [];
};

/**
 * Request Interceptor
 * Adds Authorization header with access token from cookie
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get access token from cookie and add to Authorization header
    const accessToken = getCookie('access_token');
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handles 401 errors and token refresh
 */
apiClient.interceptors.response.use(
  (response) => {
    // Pass through successful responses
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Check if error is 401 (Unauthorized) and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Check if this is the login or refresh endpoint itself failing
      // Don't try to refresh token for these endpoints
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/refresh')
      ) {
        // Login failed or refresh token is invalid/expired
        // For refresh endpoint: redirect to login
        if (originalRequest.url?.includes('/auth/refresh')) {
          redirectToLogin();
        }
        // For login endpoint: just pass the error through (invalid credentials)
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Get refresh token from cookie
        const refreshToken = getCookie('refresh_token');

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Attempt to refresh the token
        const response = await apiClient.post<{
          access_token: string;
          refresh_token: string;
          user: User;
        }>('/auth/refresh', {
          refresh_token: refreshToken,
        });

        // Store new tokens in cookies
        setAuthCookie('access_token', response.data.access_token, { maxAge: 7 * 24 * 60 * 60 }); // 7 days
        setAuthCookie('refresh_token', response.data.refresh_token, { maxAge: 30 * 24 * 60 * 60 }); // 30 days

        // Token refresh successful
        isRefreshing = false;
        processQueue();

        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed
        isRefreshing = false;
        processQueue(refreshError as Error);

        // Clear auth cookies and redirect to login (unless already on login page)
        redirectToLogin();

        return Promise.reject(refreshError);
      }
    }

    // For other errors, just reject
    return Promise.reject(error);
  }
);

/**
 * API Error Handler
 * Extracts error message from API response
 */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    // Check for API error response
    if (error.response?.data?.message) {
      return error.response.data.message;
    }

    // Check for network error
    if (error.code === 'ECONNABORTED') {
      return 'Request timeout. Please try again.';
    }

    if (error.message === 'Network Error') {
      return 'Network error. Please check your connection.';
    }

    // Generic error message
    return error.message || 'An unexpected error occurred.';
  }

  // Non-axios error
  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred.';
};

/**
 * API Response Types
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  statusCode: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}

/**
 * Type guard for API error
 */
export const isApiError = (error: unknown): error is AxiosError<ApiError> => {
  return axios.isAxiosError(error) && error.response !== undefined;
};
