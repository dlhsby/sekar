/**
 * Auth API Service
 * Authentication related API calls
 */

import { get, post } from './apiClient';
import type {
  LoginRequest,
  LoginResponse,
  MeResponse,
  ApiResponse,
} from '../../types/api.types';

/**
 * Login user
 * @param username - Username
 * @param password - Password
 * @returns Login response with token and user data
 */
export async function login(
  username: string,
  password: string,
): Promise<ApiResponse<LoginResponse>> {
  const payload: LoginRequest = { username, password };
  return post<LoginResponse>('/api/auth/login', payload);
}

/**
 * Get current user information
 * @returns User data with assigned area
 */
export async function getMe(): Promise<ApiResponse<MeResponse>> {
  return get<MeResponse>('/api/auth/me');
}

/**
 * Logout user (optional endpoint)
 * For MVP, we just clear local storage
 * @returns Logout response
 */
export async function logout(): Promise<ApiResponse<{ success: boolean }>> {
  return post<{ success: boolean }>('/api/auth/logout');
}

