/**
 * NotificationsScreen — Phase 4 M3d (NOTIF-1).
 *
 * Inbox view of in-app notifications. Lists newest-first, paints unread
 * items with a thicker left bar + bold title, and offers:
 * - Pull-to-refresh (re-fetches page 1 from server).
 * - Tap a row → marks read locally + remote, then deep-links to the
 *   underlying entity if `data.task_id` or `data.pruning_request_id` is
 *   present (matching the FCM tap-routing in RootNavigator).
 * - "Tandai semua dibaca" action when unread > 0.
 *
 * Backed by the existing `notificationsApi` (Phase 2) and the
 * `notificationsSlice` (already populated by FCM foreground handler).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  markAllAsRead as markAllAsReadLocal,
  markAsRead as markAsReadLocal,
  selectAllNotifications,
  selectNotificationsLoading,
  selectUnreadCount,
  setError,
  setLoading,
  setNotifications,
} from '../../store/slices/notificationsSlice';
import {
  getNotifications,
  markAllAsRead,
  markAsRead,
} from '../../services/api/notificationsApi';
import type { Notification } from '../../types/models.types';
import { nbBorders, nbColors, nbSpacing } from '../../constants/nbTokens';
import { NBEmptyState } from '../../components/nb';

function formatRelativeTime(iso: string): string {
  try {
    const then = new Date(iso).getTime();
    const diffSec = Math.floor((Date.now() - then) / 1000);
    if (diffSec < 60) return 'Baru saja';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
    if (diffSec < 7 * 86400) return `${Math.floor(diffSec / 86400)} hari lalu`;
    return new Date(iso).toLocaleDateString('id-ID');
  } catch {
    return '';
  }
}

export function NotificationsScreen(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const notifications = useAppSelector(selectAllNotifications);
  const unreadCount = useAppSelector(selectUnreadCount);
  const isLoading = useAppSelector(selectNotificationsLoading);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPage = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const res = await getNotifications({ page: 1, limit: 50 });
      // The list response wraps the array as `data.data`; `res.data` is the
      // outer API wrapper (`ApiResponse<NotificationsListResponse>`).
      const list = (res.data?.data ?? []) as Notification[];
      dispatch(setNotifications(list));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat notifikasi';
      dispatch(setError(message));
    }
  }, [dispatch]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPage();
    setRefreshing(false);
  }, [fetchPage]);

  const handlePress = useCallback(
    async (n: Notification) => {
      if (!n.read) {
        dispatch(markAsReadLocal(n.id));
        try {
          await markAsRead(n.id);
        } catch {
          // Optimistic: keep local state even if remote ack fails; next
          // page refresh will reconcile.
        }
      }
      // Deep-link by data — mirrors deepLinkFromNotificationData in
      // RootNavigator so tray-tap and inbox-tap behave the same.
      const data = (n.data ?? {}) as Record<string, unknown>;
      const taskId = typeof data.task_id === 'string' ? data.task_id : undefined;
      const requestId =
        typeof data.pruning_request_id === 'string' ? data.pruning_request_id : undefined;
      if (taskId) {
        (navigation.navigate as (...a: unknown[]) => void)('TaskDetail', { taskId });
      } else if (requestId) {
        (navigation.navigate as (...a: unknown[]) => void)('PruningDetail', { requestId });
      }
    },
    [dispatch, navigation],
  );

  const handleMarkAllRead = useCallback(async () => {
    dispatch(markAllAsReadLocal());
    try {
      await markAllAsRead();
    } catch {
      // Optimistic; next refresh reconciles.
    }
  }, [dispatch]);

  return (
    <SafeAreaView style={styles.root} testID="notifications-screen">
      {unreadCount > 0 ? (
        <View style={styles.actionsBar}>
          <Text style={styles.unreadLabel}>
            {unreadCount} belum dibaca
          </Text>
          <TouchableOpacity
            onPress={handleMarkAllRead}
            accessibilityRole="button"
            testID="notifications-mark-all-read"
          >
            <Text style={styles.actionLink}>Tandai semua dibaca</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          notifications.length === 0 ? styles.emptyContent : styles.listContent
        }
        refreshControl={
          <RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handlePress(item)}
            style={[styles.row, !item.read ? styles.rowUnread : null]}
            testID={`notification-row-${item.id}`}
          >
            <View
              style={[
                styles.unreadDot,
                { opacity: item.read ? 0 : 1 },
              ]}
            />
            <View style={styles.rowBody}>
              <Text
                style={[styles.title, !item.read ? styles.titleUnread : null]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text style={styles.body} numberOfLines={2}>
                {item.body}
              </Text>
              <Text style={styles.meta}>{formatRelativeTime(item.created_at)}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <NBEmptyState
              variant="noData"
              title="Belum ada notifikasi"
              description="Notifikasi tugas, lembur, dan pengumuman akan muncul di sini."
              testID="notifications-empty"
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: (nbColors as unknown as Record<string, string>).paper ?? '#F5F0EB',
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: nbSpacing?.md ?? 16,
    paddingVertical: 10,
    borderBottomWidth: nbBorders?.thin ?? 1,
    borderBottomColor: nbColors.black ?? '#1C1917',
  },
  unreadLabel: {
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.04,
    color: nbColors.black ?? '#1C1917',
  },
  actionLink: {
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.04,
    color: nbColors.primary ?? '#1A4D2E',
  },
  listContent: { paddingVertical: 8 },
  emptyContent: { flexGrow: 1, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: nbSpacing?.md ?? 16,
    paddingVertical: 12,
    borderBottomWidth: nbBorders?.thin ?? 1,
    borderBottomColor: '#E5E0D8',
    gap: 10,
    backgroundColor: 'transparent',
  },
  rowUnread: {
    backgroundColor: '#FFF7EA',
  },
  unreadDot: {
    width: 8,
    height: 8,
    marginTop: 6,
    backgroundColor: nbColors.danger ?? '#E53935',
  },
  rowBody: { flex: 1 },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: nbColors.black ?? '#1C1917',
    marginBottom: 2,
  },
  titleUnread: {
    fontWeight: '800',
  },
  body: {
    fontSize: 13,
    color: nbColors.black ?? '#1C1917',
    opacity: 0.8,
    marginBottom: 4,
  },
  meta: {
    fontSize: 11,
    color: nbColors.black ?? '#1C1917',
    opacity: 0.6,
  },
});

export default NotificationsScreen;
