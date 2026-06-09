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
 * Header (title + back arrow) is provided by MainNavigator via FieldHomeHeader.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
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
import { nbBorders, nbColors, nbRadius, nbSpacing } from '../../constants/nbTokens';
import { NBEmptyState, NBText } from '../../components/nb';

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
          // Optimistic: keep local state even if remote ack fails
        }
      }
      const data = (n.data ?? {}) as Record<string, unknown>;
      const taskId = typeof data.task_id === 'string' ? data.task_id : undefined;
      const requestId =
        typeof data.pruning_request_id === 'string' ? data.pruning_request_id : undefined;
      // This screen now lives in the MainStack (slide-in); the detail targets live
      // in the nested tab navigator, so navigate through 'Tabs'.
      if (taskId) {
        (navigation.navigate as (...a: unknown[]) => void)('Tabs', {
          screen: 'TaskDetail',
          params: { taskId },
        });
      } else if (requestId) {
        (navigation.navigate as (...a: unknown[]) => void)('Tabs', {
          screen: 'PruningDetail',
          params: { requestId },
        });
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
    <SafeAreaView style={styles.root} edges={['bottom']} testID="notifications-screen">
      {unreadCount > 0 ? (
        <View style={styles.actionsBar}>
          <NBText variant="mono-sm" color="gray700" uppercase>
            {unreadCount} belum dibaca
          </NBText>
          <TouchableOpacity
            onPress={handleMarkAllRead}
            accessibilityRole="button"
            testID="notifications-mark-all-read"
          >
            <NBText variant="mono-sm" color="primary" uppercase style={styles.actionLink}>
              Tandai semua dibaca
            </NBText>
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
          <RefreshControl
            refreshing={refreshing || isLoading}
            onRefresh={onRefresh}
            colors={[nbColors.primary]}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handlePress(item)}
            style={[styles.row, !item.read && styles.rowUnread]}
            testID={`notification-row-${item.id}`}
            accessibilityRole="button"
          >
            <View style={[styles.unreadDot, { opacity: item.read ? 0 : 1 }]} />
            <View style={styles.rowBody}>
              <NBText
                variant="body-sm"
                color={item.read ? 'gray700' : 'black'}
                style={item.read ? undefined : styles.titleUnread}
                numberOfLines={1}
              >
                {item.title}
              </NBText>
              <NBText
                variant="body-sm"
                color="gray600"
                style={styles.bodyText}
                numberOfLines={2}
              >
                {item.body}
              </NBText>
              <NBText variant="caption" color="gray500">
                {formatRelativeTime(item.created_at)}
              </NBText>
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
    backgroundColor: nbColors.bgCanvas,
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    borderBottomWidth: nbBorders.widthThin,
    borderBottomColor: nbColors.black,
    backgroundColor: nbColors.white,
  },
  actionLink: {
    letterSpacing: 0.4,
  },
  listContent: { paddingVertical: nbSpacing.xs },
  emptyContent: { flexGrow: 1, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm + 4,
    borderBottomWidth: nbBorders.widthThin,
    borderBottomColor: nbColors.gray200,
    gap: nbSpacing.sm,
    backgroundColor: 'transparent',
  },
  rowUnread: {
    backgroundColor: nbColors.bgAccentYellow,
    borderLeftWidth: nbBorders.widthThick,
    borderLeftColor: nbColors.warning,
  },
  unreadDot: {
    width: 8,
    height: 8,
    marginTop: 5,
    borderRadius: nbRadius.full,
    backgroundColor: nbColors.danger,
    flexShrink: 0,
  },
  rowBody: { flex: 1 },
  titleUnread: {
    fontWeight: '700',
  },
  bodyText: {
    marginTop: 2,
    marginBottom: 2,
  },
});

export default NotificationsScreen;
