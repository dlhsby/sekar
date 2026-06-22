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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
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
import { NBEmptyState, NBSkeleton, NBTab, NBText } from '../../components/nb';

// Category filter (matches the grouping in NotificationPreferencesScreen).
type NotifCategory = 'all' | 'task' | 'activity' | 'overtime' | 'system';

const CATEGORY_TABS: { key: NotifCategory; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'task', label: 'Tugas' },
  { key: 'activity', label: 'Aktivitas' },
  { key: 'overtime', label: 'Lembur' },
  { key: 'system', label: 'Sistem' },
];

/** Map a notification `type` (e.g. `task_assigned`) to its filter category. */
function categoryOf(type: string): Exclude<NotifCategory, 'all'> {
  if (type.startsWith('task')) return 'task';
  if (type.startsWith('activity')) return 'activity';
  if (type.startsWith('overtime')) return 'overtime';
  return 'system';
}

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

interface NotificationRowProps {
  notification: Notification;
  onPress: (n: Notification) => void;
}

const NotificationRow = React.memo(function NotificationRow({
  notification,
  onPress,
}: NotificationRowProps): React.JSX.Element {
  const handlePress = useCallback(() => onPress(notification), [onPress, notification]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.row, !notification.read && styles.rowUnread]}
      testID={`notification-row-${notification.id}`}
      accessibilityRole="button"
    >
      <View style={[styles.unreadDot, { opacity: notification.read ? 0 : 1 }]} />
      <View style={styles.rowBody}>
        <NBText
          variant="body-sm"
          color={notification.read ? 'gray700' : 'black'}
          style={notification.read ? undefined : styles.titleUnread}
          numberOfLines={1}
        >
          {notification.title}
        </NBText>
        <NBText
          variant="body-sm"
          color="gray600"
          style={styles.bodyText}
          numberOfLines={2}
        >
          {notification.body}
        </NBText>
        <NBText variant="caption" color="gray500">
          {formatRelativeTime(notification.created_at)}
        </NBText>
      </View>
    </TouchableOpacity>
  );
});

export function NotificationsScreen(): React.JSX.Element {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route = useRoute();
  const origin = (route.params as { origin?: string } | undefined)?.origin;

  // Android hardware back + iOS swipe-back bypass the header chevron's onBack
  // (which is owned by MainNavigator's withProfileHeader). Route them through the
  // same destination — the tab the bell was opened from, else Home — so the
  // deep-link round-trip (inbox → detail → back → inbox → back) can't loop.
  useFocusEffect(
    useCallback(() => {
      const goToOrigin = (): boolean => {
        (navigation.navigate as (...a: unknown[]) => void)('Tabs', {
          screen: origin ?? 'Home',
        });
        return true; // event handled — suppress the default pop
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', goToOrigin);
      return () => sub.remove();
    }, [navigation, origin]),
  );

  const notifications = useAppSelector(selectAllNotifications);
  const unreadCount = useAppSelector(selectUnreadCount);
  const isLoading = useAppSelector(selectNotificationsLoading);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState<NotifCategory>('all');

  const filtered = useMemo(
    () =>
      category === 'all'
        ? notifications
        : notifications.filter((n) => categoryOf(n.type) === category),
    [notifications, category],
  );

  const fetchPage = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const res = await getNotifications();
      const list = (res.data ?? []) as Notification[];
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
      // This screen lives in the MainStack (slide-in); the detail targets live in
      // the nested tab navigator, so navigate through 'Tabs'. `from: 'Notifications'`
      // makes the detail's back button return here (the inbox) instead of the
      // task/pruning list.
      if (taskId) {
        (navigation.navigate as (...a: unknown[]) => void)('Tabs', {
          screen: 'TaskDetail',
          params: { taskId, from: 'Notifications' },
        });
      } else if (requestId) {
        (navigation.navigate as (...a: unknown[]) => void)('Tabs', {
          screen: 'PruningDetail',
          params: { requestId, from: 'Notifications' },
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
      <View style={styles.filterTabsWrap}>
        <NBTab
          tabs={CATEGORY_TABS}
          activeTab={category}
          onTabChange={(key) => setCategory(key as NotifCategory)}
          scrollable
          testID="notifications-filter"
        />
      </View>
      {unreadCount > 0 ? (
        <View style={styles.actionsBar}>
          <NBText variant="mono-sm" color="gray700" uppercase>
            {unreadCount} belum dibaca
          </NBText>
          <TouchableOpacity
            onPress={handleMarkAllRead}
            accessibilityRole="button"
            accessibilityLabel="Tandai semua notifikasi sebagai dibaca"
            testID="notifications-mark-all-read"
          >
            <NBText variant="mono-sm" color="primary" uppercase style={styles.actionLink}>
              Tandai semua dibaca
            </NBText>
          </TouchableOpacity>
        </View>
      ) : null}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          filtered.length === 0 ? styles.emptyContent : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isLoading}
            onRefresh={onRefresh}
            colors={[nbColors.primary]}
          />
        }
        renderItem={useCallback(
          ({ item }: { item: Notification }) => (
            <NotificationRow notification={item} onPress={handlePress} />
          ),
          [handlePress],
        )}
        maxToRenderPerBatch={10}
        windowSize={10}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.skeletonContainer}>
              <NBSkeleton variant="list" count={5} />
            </View>
          ) : (
            <NBEmptyState
              variant="noData"
              title="Belum ada notifikasi"
              description="Notifikasi tugas, lembur, dan pengumuman akan muncul di sini."
              testID="notifications-empty"
            />
          )
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
  // Wrap the (fixed-height, scrollable) NBTab so vertical padding never clips
  // the pill. Horizontal padding is owned by NBTab's scroll content.
  filterTabsWrap: {
    paddingTop: nbSpacing.sm,
    paddingBottom: nbSpacing.sm,
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
  // Top-aligned (not vertically centred) so the empty illustration sits a
  // standard distance below the filter tabs rather than floating mid-screen.
  emptyContent: { flexGrow: 1, paddingTop: nbSpacing.xl },
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
  skeletonContainer: {
    padding: nbSpacing.md,
  },
});

export default NotificationsScreen;
