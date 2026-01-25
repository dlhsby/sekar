/**
 * Users API Service
 * Handles user profile operations including password changes
 */

import { post } from './apiClient';
import type { ApiResponse } from '../../types/api.types';

/**
 * Change password request payload
 */
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

/**
 * Change password for the currently authenticated user
 * @param currentPassword - User's current password for verification
 * @param newPassword - New password to set
 * @returns Success or error response
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ApiResponse<void>> {
  try {
    const response = await post<void>('/users/me/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });

    if (response.error) {
      return { error: response.error };
    }

    return { data: undefined };
  } catch (error: any) {
    return {
      error: error.response?.data?.message || 'Gagal mengubah password',
    };
  }
}
