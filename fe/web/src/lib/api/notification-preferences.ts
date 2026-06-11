/**
 * Notification Preferences API Client (Phase 4-R — settings surface on web)
 *
 * Wraps the per-type push toggles the backend exposes at
 *   GET   /users/:id/notification-preferences → { type, enabled }[]
 *   PATCH /users/:id/notification-preferences → { type, enabled }[]
 *
 * Only the CONFIGURABLE_NOTIFICATION_TYPES set is returned (9 types); the GET
 * always returns the full effective list (defaults to enabled). Owner-or-admin
 * gated server-side, so callers pass their own user id.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type { NotificationType } from './notifications';

/** A single configurable per-type push preference. */
export interface NotificationPreference {
  type: NotificationType;
  enabled: boolean;
}

const keys = {
  all: ['notification-preferences'] as const,
  detail: (userId: string) => [...keys.all, userId] as const,
};

/** Indonesian labels for the configurable notification types (settings UI). */
export const NOTIFICATION_TYPE_LABELS: Partial<Record<NotificationType, string>> = {
  task_assigned: 'Tugas baru ditugaskan',
  task_completed: 'Tugas selesai',
  task_updated: 'Tugas diperbarui',
  activity_approved: 'Aktivitas disetujui',
  activity_rejected: 'Aktivitas ditolak',
  overtime_approved: 'Lembur disetujui',
  overtime_rejected: 'Lembur ditolak',
  missing_worker_alert: 'Peringatan petugas hilang',
  shift_reminder: 'Pengingat jadwal',
  area_plant_overdue: 'Tanaman terlambat dipangkas',
};

/** Fetch the current user's per-type push preferences. */
export function useNotificationPreferences(userId: string | undefined) {
  return useQuery({
    queryKey: keys.detail(userId ?? ''),
    queryFn: async (): Promise<NotificationPreference[]> => {
      const response = await apiClient.get<NotificationPreference[]>(
        `/users/${userId}/notification-preferences`,
      );
      return response.data;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

/** Bulk-upsert the current user's preferences; returns the effective list. */
export function useUpdateNotificationPreferences(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (preferences: NotificationPreference[]): Promise<NotificationPreference[]> => {
      const response = await apiClient.patch<NotificationPreference[]>(
        `/users/${userId}/notification-preferences`,
        { preferences },
      );
      return response.data;
    },
    onSuccess: (data) => {
      if (userId) qc.setQueryData(keys.detail(userId), data);
    },
  });
}
