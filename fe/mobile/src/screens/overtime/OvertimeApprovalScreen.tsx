/**
 * Overtime Approval Screen
 * Phase 2C: Korlap batch approval view for pending overtime requests
 */

import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { MainTabScreenProps } from '../../types/navigation.types';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import {
  selectPendingApprovals,
  selectOvertimeLoading,
  setLoading,
  setPendingApprovals,
  setError,
} from '../../store/slices/overtimeSlice';
import { getPendingApprovals } from '../../services/api/overtimeApi';
import { NBCard, NBEmptyState, NBBackgroundPattern } from '../../components/nb';
import { nbColors, nbSpacing, nbTypography, nbBorders } from '../../constants/nbTokens';
import type { Overtime } from '../../types/models.types';

/**
 * Format date to Indonesian
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Pending Overtime Card Component
 */
interface PendingOvertimeCardProps {
  overtime: Overtime;
  onPress: () => void;
}

function PendingOvertimeCard({
  overtime,
  onPress,
}: PendingOvertimeCardProps): React.JSX.Element {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <NBCard style={styles.card}>
        <View style={styles.cardContent}>
          {overtime.user && (
            <Text style={styles.userName}>{overtime.user.full_name}</Text>
          )}
          <Text style={styles.date}>{formatDate(overtime.date)}</Text>
          <Text style={styles.time}>
            {overtime.start_time} - {overtime.end_time}
          </Text>
          {overtime.activityType && (
            <Text style={styles.activityType}>
              {overtime.activityType.name}
            </Text>
          )}
        </View>
      </NBCard>
    </TouchableOpacity>
  );
}

/**
 * Overtime Approval Screen Component
 */
export const OvertimeApprovalScreen: React.FC<
  MainTabScreenProps<'OvertimeApproval'>
> = () => {
  const navigation = useNavigation<MainTabScreenProps<'OvertimeApproval'>['navigation']>();
  const dispatch = useAppDispatch();

  const pendingApprovals = useAppSelector(selectPendingApprovals);
  const isLoading = useAppSelector(selectOvertimeLoading);

  const [refreshing, setRefreshing] = useState(false);

  // Filter only pending status
  const pendingOnly = pendingApprovals.filter((o) => o.status === 'pending');

  // Fetch pending approvals
  const fetchPendingApprovals = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const response = await getPendingApprovals();
      if (response.data) {
        dispatch(setPendingApprovals(response.data));
      } else if (response.error) {
        dispatch(setError(response.error));
      }
    } catch (error) {
      dispatch(setError('Gagal memuat data lembur'));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  // Initial load
  useEffect(() => {
    fetchPendingApprovals();
  }, [fetchPendingApprovals]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPendingApprovals();
    setRefreshing(false);
  }, [fetchPendingApprovals]);

  // Navigate to detail
  const handleOvertimePress = useCallback(
    (overtimeId: string) => {
      navigation.navigate('OvertimeDetail', { overtimeId });
    },
    [navigation],
  );

  // Render item
  const renderItem = useCallback(
    ({ item }: { item: Overtime }) => (
      <PendingOvertimeCard
        overtime={item}
        onPress={() => handleOvertimePress(item.id)}
      />
    ),
    [handleOvertimePress],
  );

  return (
    <SafeAreaView style={styles.container}>
      <NBBackgroundPattern style={styles.background} />
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Persetujuan Lembur</Text>
          {pendingOnly.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingOnly.length}</Text>
            </View>
          )}
        </View>

        {/* List */}
        <FlatList
          data={pendingOnly}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <NBEmptyState
              variant="noData"
              title="Tidak ada pengajuan"
              description="Tidak ada pengajuan lembur yang menunggu persetujuan"
            />
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: nbColors.background,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    backgroundColor: nbColors.white,
    borderBottomWidth: nbBorders.base,
    borderBottomColor: nbColors.black,
  },
  headerTitle: {
    fontSize: nbTypography.fontSize['2xl'],
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  badge: {
    backgroundColor: nbColors.warning,
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    borderRadius: 12,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  listContent: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    flexGrow: 1,
  },
  card: {
    marginBottom: nbSpacing.md,
  },
  cardContent: {
    gap: nbSpacing.xs,
  },
  userName: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
  },
  date: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray[700],
  },
  time: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray[600],
  },
  activityType: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.primary,
  },
});
