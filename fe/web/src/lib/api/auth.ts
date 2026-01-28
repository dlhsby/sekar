import { apiClient } from './client';

/**
 * User Role Type
 * Must match backend UserRole enum
 */
export type UserRole =
  | 'admin'
  | 'top_management'
  | 'kepala_rayon'
  | 'koordinator_lapangan'
  | 'worker'
  | 'linmas';

/**
 * User interface from backend
 */
export interface User {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  rayon_id?: string;
  created_at?: string;
  assigned_area?: {
    id: string;
    name: string;
    area_type_id: string;
    gps_lat: number;
    gps_lng: number;
    radius_meters: number;
    address?: string;
  };
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Authentication response from backend
 */
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

/**
 * Auth API Client
 * Handles authentication-related API calls
 */
export const authApi = {
  /**
   * Login with username and password
   * Backend sets httpOnly cookies for both access and refresh tokens
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  /**
   * Logout current user
   * Backend clears httpOnly cookies
   */
  logout: async (): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/logout');
    return response.data;
  },

  /**
   * Refresh access token using refresh token from httpOnly cookie
   * Backend rotates both access and refresh tokens
   */
  refreshToken: async (): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/refresh');
    return response.data;
  },

  /**
   * Get current authenticated user
   * Requires valid access token in httpOnly cookie
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },
};
