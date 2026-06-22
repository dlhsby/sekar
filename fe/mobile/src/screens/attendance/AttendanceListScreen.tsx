/**
 * Attendance List Screen ("Kehadiran")
 * The user's regular attendance history, grouped by day (newest first) — mirrors
 * the Lembur list. Tapping a day opens its detail; the bottom action button opens
 * the clock-in/out screen (or the overtime form when an overtime shift is active).
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  NBBackgroundPattern,
  NBButton,
  NBEmptyState,
  NBFabBar,
  NB_FAB_BAR_HEIGHT,
  NBSkeleton,
} from '../../components/nb';
import { AttendanceDayCard } from './components/AttendanceDayCard';
import { getAttendanceDays } from '../../services/api/shiftsApi';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import { useAppSelector } from '../../store/hooks';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import type { MainTabParamList } from '../../types/navigation.types';
import type { AttendanceDaySummary } from '../../types/api.types';

const PAGE_LIMIT = 20;

type Props = {
  navigation: NativeStackNavigationProp<MainTabParamList, 'Attendance'>;
};

export function AttendanceListScreen({ navigation }: Props): React.JSX.Element {
  const { canClock } = useRoleAccess();
  const currentShift = useAppSelector((state) => state.shift.currentShift);

  const [days, setDays] = useState<AttendanceDaySummary[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isFetching = useRef(false);

  const fetchDays = useCallback(async (p: number, reset: boolean) => {
    if (isFetching.current) {
      return;
    }
    isFetching.current = true;
    if (reset) {
      setLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const response = await getAttendanceDays(p, PAGE_LIMIT);
      if (response.error || !response.data) {
        return;
      }
      const data = response.data.data ?? [];
      const total = response.data.meta?.total ?? 0;

      setDays((prev) => {
        if (reset) {
          return data;
        }
        const seen = new Set(prev.map((d) => d.date));
        return [...prev, ...data.filter((d) => !seen.has(d.date))];
      });
      setPage(p);
      setHasMore(p * PAGE_LIMIT < total);
    } finally {
      isFetching.current = false;
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDays(1, true);
    }, [fetchDays]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchDays(1, true);
    } finally {
      setRefreshing(false);
    }
  }, [fetchDays]);

  const loadMore = useCallback(() => {
    if (!hasMore || isFetching.current || isLoadingMore) {
      return;
    }
    fetchDays(page + 1, false);
  }, [hasMore, isLoadingMore, page, fetchDays]);

  const handleDayPress = useCallback(
    (date: string) => navigation.navigate('AttendanceDetail', { date }),
    [navigation],
  );

  // Same routing rule as the home FAB: overtime shift → overtime form, else clock screen.
  const handleClockAction = useCallback(() => {
    if (currentShift?.is_overtime) {
      navigation.navigate('OvertimeSubmit');
    } else {
      navigation.navigate('Absensi');
    }
  }, [currentShift, navigation]);

  const renderItem = useCallback(
    ({ item }: { item: AttendanceDaySummary }) => (
      <AttendanceDayCard summary={item} onPress={() => handleDayPress(item.date)} />
    ),
    [handleDayPress],
  );

  const keyExtractor = useCallback((item: AttendanceDaySummary) => item.date, []);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) {
      return null;
    }
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={nbColors.primary} />
      </View>
    );
  }, [isLoadingMore]);

  const isClockOut = !!currentShift && !currentShift.is_overtime;

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.bgCanvas}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.listWrapper, canClock && styles.listWrapperWithFab]}>
          <FlatList
            style={styles.list}
            data={days}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            removeClippedSubviews
            maxToRenderPerBatch={10}
            windowSize={10}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={
              loading ? (
                <View style={styles.skeletonContainer}>
                  <NBSkeleton variant="list" count={5} />
                </View>
              ) : (
                <NBEmptyState
                  variant="noData"
                  illustration="illo-reports"
                  title="Belum ada kehadiran"
                  description="Riwayat kehadiran Anda akan muncul di sini setelah clock in."
                />
              )
            }
          />
        </View>

        {canClock && (
          <NBFabBar>
            <NBButton
              title={isClockOut ? 'Clock Out' : 'Clock In'}
              onPress={handleClockAction}
              variant={isClockOut ? 'danger' : 'primary'}
              size="lg"
              fullWidth
              accessibilityLabel={isClockOut ? 'Clock out dari shift aktif' : 'Clock in untuk memulai shift'}
            />
          </NBFabBar>
        )}
      </SafeAreaView>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listWrapper: {
    flex: 1,
    paddingTop: nbSpacing.sm,
  },
  listWrapperWithFab: {
    paddingBottom: NB_FAB_BAR_HEIGHT,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: nbSpacing.md,
    paddingBottom: nbSpacing['2xl'],
    flexGrow: 1,
  },
  footerLoader: {
    paddingVertical: nbSpacing.md,
    alignItems: 'center',
  },
  skeletonContainer: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
  },
});
