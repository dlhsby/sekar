/**
 * Notifications API Service
 *
 * Handles push notification registration and history for Phase 2.
 */

import { get, post, put, del } from './apiClient';
import type { ApiResponse } from '../../types/api.types';
import type {
  Notification,
  RegisterDeviceRequest,
  NotificationsFilter,
  NotificationsListResponse,
  BroadcastNotificationRequest,
} from '../../types/api.types';

/**
 * Register device for push notifications
 */
export async function registerDevice(
  data: RegisterDeviceRequest,
): Promise<ApiResponse<{ success: boolean }>> {
  return post<{ success: boolean }>('/notifications/register', data);
}

/**
 * Unregister device from push notifications
 */
export async function unregisterDevice(): Promise<
  ApiResponse<{ success: boolean }>
> {
  return del<{ success: boolean }>('/notifications/unregister');
}

/**
 * Get notification history
 */
export async function getNotifications(
  filters?: NotificationsFilter & { page?: number; limit?: number },
): Promise<ApiResponse<NotificationsListResponse>> {
  return get<NotificationsListResponse>('/notifications', filters);
}

/**
 * Get notification by ID
 */
export async function getNotificationById(
  id: string,
): Promise<ApiResponse<Notification>> {
  return get<Notification>(`/notifications/${id}`);
}

/**
 * Mark notification as read
 */
export async function markAsRead(
  id: string,
): Promise<ApiResponse<Notification>> {
  return put<Notification>(`/notifications/${id}/read`);
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<
  ApiResponse<{ updated_count: number }>
> {
  return put<{ updated_count: number }>('/notifications/read-all');
}

/**
 * Broadcast notification (Admin only)
 */
export async function broadcastNotification(
  data: BroadcastNotificationRequest,
): Promise<ApiResponse<{ sent_count: number }>> {
  return post<{ sent_count: number }>('/notifications/broadcast', data);
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<
  ApiResponse<{ count: number }>
> {
  return get<{ count: number }>('/notifications/unread-count');
}

export default {
  registerDevice,
  unregisterDevice,
  getNotifications,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  broadcastNotification,
  getUnreadCount,
};
