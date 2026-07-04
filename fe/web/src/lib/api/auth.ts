import { apiClient } from './client';
import { getCookie } from '@/lib/utils/cookies';
import type { UserRole } from '@/types/models';

/**
 * User interface from backend (Phase 2E)
 */
export interface User {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  phone_number?: string;
  profile_picture_url?: string;
  rayon_id?: string;
  area_id?: string;
  /**
   * Set true when an admin reset this user's password (ADR-041, Phase 4-7).
   * Forces the user through `/change-password` before reaching the dashboard;
   * cleared by POST /auth/change-password. Returned by /auth/login and /auth/me.
   */
  password_must_change?: boolean;
  /**
   * Preferred UI language ('id' | 'en'), synced to the profile so the choice
   * follows the user across devices. Applied by the i18n LanguageSync on load.
   * Absent → default to Indonesian.
   */
  preferred_language?: 'id' | 'en';
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
 * Login credentials (Phase 2E - ADR-012: identifier can be username or phone number)
 */
export interface LoginCredentials {
  identifier: string;
  password: string;
}

/**
 * Change-password payload (ADR-041). `old_password` is optional — required for a
 * voluntary change, omitted in the admin-forced flow (the JWT + the
 * `password_must_change` flag already authorise the change).
 */
export interface ChangePasswordPayload {
  old_password?: string;
  new_password: string;
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
    // Phase 4-7 (M2): the backend blacklists both tokens, so the refresh token
    // must be sent in the body (LogoutDto requires it — an empty body 400s).
    const refresh_token = getCookie('refresh_token') ?? '';
    const response = await apiClient.post<{ message: string }>('/auth/logout', { refresh_token });
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

  /**
   * Change the current user's password. Returns a fresh token pair (the backend
   * rotates tokens and clears `password_must_change`) — callers must replace the
   * stored cookies with the new tokens.
   */
  changePassword: async (payload: ChangePasswordPayload): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/change-password', payload);
    return response.data;
  },
};
