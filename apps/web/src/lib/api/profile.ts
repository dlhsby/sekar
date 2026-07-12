/**
 * Profile API (Phase 4-R — self-service profile)
 *
 * Lets the authenticated user update THEIR OWN profile and avatar:
 *   PATCH /users/me                     → { full_name?, phone_number? } (self-only)
 *   POST  /users/:id/profile-picture    → multipart `file` → { profile_picture_url }
 *
 * Both are followed by `refreshUser()` (auth context) so the header avatar and
 * the profile form reflect the change immediately.
 */
import { useMutation } from '@tanstack/react-query';
import i18n from '@/lib/i18n/config';
import { apiClient } from './client';
import type { User } from './auth';

export interface UpdateMyProfilePayload {
  full_name?: string;
  username?: string;
  phone_number?: string;
  preferred_language?: 'id' | 'en';
}

/**
 * Persist the current user's preferred UI language to their profile so the
 * choice follows them across devices. Best-effort — the local i18n switch is
 * applied regardless of whether this succeeds.
 */
export async function updateMyLanguage(preferred_language: 'id' | 'en'): Promise<void> {
  await apiClient.patch('/users/me', { preferred_language });
}

/** Update the current user's own name / phone (self-service, no admin rights). */
export function useUpdateMyProfile() {
  return useMutation({
    mutationFn: async (payload: UpdateMyProfilePayload): Promise<User> => {
      const response = await apiClient.patch<User>('/users/me', payload);
      return response.data;
    },
  });
}

/**
 * Upload the current user's profile picture. The backend stores it and returns
 * the new `profile_picture_url`. FormData uses the `file` field; we override the
 * client's default JSON content-type so the multipart boundary is set correctly.
 */
export function useUploadProfilePicture(userId: string | undefined) {
  return useMutation({
    mutationFn: async (file: File): Promise<{ profile_picture_url: string }> => {
      if (!userId) throw new Error(i18n.t('common:errors2.userNotFound'));
      const form = new FormData();
      form.append('file', file);
      const response = await apiClient.post<{ profile_picture_url: string }>(
        `/users/${userId}/profile-picture`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data;
    },
  });
}
