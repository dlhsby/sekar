/**
 * Notifications API Client (Phase 4-R — in-app notification surface on web)
 *
 * Mirrors the mobile notificationsApi but emits TanStack Query hooks for the
 * dashboard bell + inbox page. The backend (`be/src/modules/notifications`)
 * exposes:
 *   GET    /notifications              → Notification[] (newest-first, capped at 100)
 *   GET    /notifications/unread-count → { count }
 *   PATCH  /notifications/:id/read     → Notification
 *   PATCH  /notifications/read-all     → { marked }
 *
 * The list endpoint is NOT paginated, so the inbox paginates client-side.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

/** Lowercase notification types — kept in sync with the backend NotificationType enum. */
export type NotificationType =
  | 'task_assigned'
  | 'task_updated'
  | 'task_completed'
  | 'task_declined'
  | 'shift_reminder'
  | 'report_submitted'
  | 'announcement'
  | 'system'
  | 'activity_approved'
  | 'activity_rejected'
  | 'activity_tagged'
  | 'overtime_approved'
  | 'overtime_rejected'
  | 'missing_worker_alert';

export interface AppNotification extends Record<string, unknown> {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: NotificationType;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationFilters {
  is_read?: boolean;
  type?: NotificationType;
}

const keys = {
  all: ['notifications'] as const,
  lists: () => [...keys.all, 'list'] as const,
  list: (f?: NotificationFilters) => [...keys.lists(), f ?? {}] as const,
  unreadCount: () => [...keys.all, 'unread-count'] as const,
};

/** Full inbox list (newest-first). Pass `{ is_read: false }` for unread-only. */
export function useNotifications(filters?: NotificationFilters) {
  return useQuery({
    queryKey: keys.list(filters),
    queryFn: async () => {
      const response = await apiClient.get<AppNotification[]>('/notifications', {
        params: filters,
      });
      return response.data;
    },
    staleTime: 30 * 1000,
  });
}

/** Unread badge count for the top-bar bell. Polls so the badge stays fresh. */
export function useUnreadCount() {
  return useQuery({
    queryKey: keys.unreadCount(),
    queryFn: async () => {
      const response = await apiClient.get<{ count: number }>('/notifications/unread-count');
      return response.data.count;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.patch<AppNotification>(`/notifications/${id}/read`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate the whole notifications namespace (lists + unread count) so
      // the bell, popover and inbox all reconcile after a read.
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.patch<{ marked: number }>('/notifications/read-all');
      return response.data;
    },
    onSuccess: () => {
      // Invalidate the whole notifications namespace (lists + unread count) so
      // the bell, popover and inbox all reconcile after a read.
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}
