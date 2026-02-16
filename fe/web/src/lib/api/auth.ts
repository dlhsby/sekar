import { apiClient } from './client';
import type { UserRole } from '@/types/models';

/**
 * User interface from backend (Phase 2C)
 */
export interface User {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  rayon_id?: string;
  area_id?: string;
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

export type { UserRole };

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
 */
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  logout: async (): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/logout');
    return response.data;
  },

  refreshToken: async (): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/refresh');
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },
};
