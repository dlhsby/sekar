/**
 * Users API Service
 * Handles user profile operations including password changes
 */

import { get, patch } from './apiClient';
import type { ApiResponse } from '../../types/api.types';
import type { User, Area } from '../../types/models.types';
import { getToken } from '../storage/secureStorage';
import config from '../../constants/config';

/**
 * Change password request payload
 */
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

/**
 * Get all users (for task/replacement assignment pickers).
 *
 * The backend paginates `/users` and caps `limit`, so a single request drops the
 * tail once the roster exceeds the cap (staging has >1000 users) — assignable-user
 * pickers then silently miss whole rayons. Walk every page and return the full
 * list. `limit` is the per-page size.
 *
 * @param limit - Page size for the walk (default 100)
 * @returns Complete list of users
 */
export async function getUsers(limit = 100): Promise<ApiResponse<User[]>> {
  const all: User[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await get<{ data: User[]; meta: { totalPages?: number } }>('/users', {
      page,
      limit,
    });
    if (!response.data?.data) {
      return page === 1 ? { data: [], error: response.error } : { data: all };
    }
    all.push(...response.data.data);
    totalPages = response.data.meta?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages && page <= 100); // page guard: never loop unbounded
  return { data: all };
}

/**
 * Get the authenticated worker's own assigned areas (permanent + task_based).
 * Backed by `GET /users/me/areas`; used for multi-area geofencing + Jadwal Saya.
 */
export async function getMyAreas(): Promise<ApiResponse<Area[]>> {
  return get<Area[]>('/users/me/areas');
}

/**
 * Get a single user by id. Backed by `GET /users/:id`.
 * Used in monitoring to fetch the worker's profile picture + full profile
 * fields not present on LiveUser / UserDaySummary.
 */
export async function getUserById(id: string): Promise<ApiResponse<User>> {
  return get<User>(`/users/${id}`);
}

/**
 * Upload profile picture for a user (Phase 2E)
 * Sends multipart/form-data with the image file under the 'file' key.
 * @param userId - Target user's ID
 * @param imageUri - Local file URI (file://...) of the image to upload
 * @returns Updated profile_picture_url
 */
export async function uploadProfilePicture(
  userId: string,
  imageUri: string,
): Promise<ApiResponse<{ profile_picture_url: string }>> {
  try {
    const token = await getToken();
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile_picture.jpg',
    } as any);

    const response = await fetch(
      `${config.API_BASE_URL}/users/${userId}/profile-picture`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return {
        error: errorBody?.message || `Gagal mengunggah foto (${response.status})`,
      };
    }

    const data = await response.json();
    return { data };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Gagal mengunggah foto profil',
    };
  }
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
    const response = await patch<void>('/users/me/change-password', {
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
