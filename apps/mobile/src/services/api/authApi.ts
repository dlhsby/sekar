/**
 * Auth API Service
 * Authentication related API calls
 */

import { get, post } from './apiClient';
import { getRefreshToken } from '../storage/secureStorage';
import type {
  LoginRequest,
  LoginResponse,
  MeResponse,
  ApiResponse,
} from '../../types/api.types';

/**
 * Login user
 * @param identifier - Username or phone number (Phase 2E)
 * @param password - Password
 * @returns Login response with token and user data
 */
export async function login(
  identifier: string,
  password: string,
): Promise<ApiResponse<LoginResponse>> {
  const payload: LoginRequest = { identifier, password };
  return post<LoginResponse>('/auth/login', payload);
}

/**
 * Get current user information
 * @returns User data with assigned area
 */
export async function getMe(): Promise<ApiResponse<MeResponse>> {
  return get<MeResponse>('/auth/me');
}

/**
 * Phase 4-7 (M3a): force or voluntary password change via `/auth/change-password`.
 *
 * Distinct from `usersApi.changePassword` (which hits the older
 * `/users/me/change-password` endpoint without token rotation). Use this one
 * for the M3a force-change flow because it returns a fresh access + refresh
 * pair the caller MUST persist via secureStorage.
 */
export async function changePasswordAndRotate(
  newPassword: string,
  oldPassword?: string,
): Promise<ApiResponse<LoginResponse>> {
  // `old_password` is only sent for a voluntary change; the admin-forced flow
  // omits it (the caller is already authenticated with the temporary password).
  return post<LoginResponse>('/auth/change-password', {
    new_password: newPassword,
    ...(oldPassword ? { old_password: oldPassword } : {}),
  });
}

/**
 * Logout user.
 *
 * Phase 4-7 (M2): backend now requires `{ refresh_token }` in the body so it
 * can blacklist BOTH tokens (access from bearer header + refresh from body).
 * If no refresh token is in secure storage (edge case: user cleared storage
 * mid-session), we still POST so the access token is at least blacklisted —
 * backend will 400 on the missing body, which the caller can ignore safely
 * (local cleanup proceeds regardless).
 */
export async function logout(): Promise<ApiResponse<{ success: boolean }>> {
  const refreshToken = (await getRefreshToken()) ?? '';
  return post<{ success: boolean }>('/auth/logout', { refresh_token: refreshToken });
}

