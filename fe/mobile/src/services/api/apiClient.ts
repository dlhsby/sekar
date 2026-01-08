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
import { getToken } from '../storage/secureStorage';
import type { ApiError, ApiResponse } from '../../types/api.types';

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
 * Request interceptor to add JWT token
 */
apiClient.interceptors.request.use(
  async (requestConfig: AxiosRequestConfig) => {
    const token = await getToken();
    
    if (token && requestConfig.headers) {
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }
    
    if (__DEV__) {
      console.log('🚀 API Request:', requestConfig.method?.toUpperCase(), requestConfig.url);
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
      console.log('✅ API Response:', response.config.url, response.status);
    }
    return response;
  },
  (error: AxiosError<ApiError>) => {
    if (__DEV__) {
      console.error('❌ API Error:', error.response?.status, error.response?.data);
    }

    // Handle specific error cases
    if (error.response) {
      const apiError: ApiError = {
        status: error.response.status,
        message: error.response.data?.message || 'An error occurred',
        errors: error.response.data?.errors,
      };

      // Handle 401 Unauthorized (token expired)
      if (error.response.status === 401) {
        // TODO: Handle logout or token refresh
        console.log('🔒 Unauthorized - Token may be expired');
      }

      return Promise.reject(apiError);
    }

    // Network error
    if (error.request) {
      const networkError: ApiError = {
        status: 0,
        message: 'Network error. Please check your connection.',
      };
      return Promise.reject(networkError);
    }

    // Unknown error
    const unknownError: ApiError = {
      status: -1,
      message: error.message || 'An unexpected error occurred',
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
    return { error: (error as ApiError).message };
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
    return { error: (error as ApiError).message };
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
    return { error: (error as ApiError).message };
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
    return { error: (error as ApiError).message };
  }
}

export default apiClient;

