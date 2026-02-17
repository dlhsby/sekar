/**
 * Overtime List Screen
 * Phase 2C: Overtime submissions and approvals
 * Shows user's own overtime submissions and pending approvals (korlap only)
 */

import React, { useState, useCallback, useEffect } from 'react';
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
  selectMyOvertimes,
  selectPendingApprovals,
  selectOvertimeLoading,
  setLoading,
  setMyOvertimes,
  setPendingApprovals,
  setError,
} from '../../store/slices/overtimeSlice';
import { getMyOvertimes, getPendingApprovals } from '../../services/api/overtimeApi';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import { NBTab, NBCard, NBBadge, NBEmptyState, NBButton, NBBackgroundPattern } from '../../components/nb';
import { nbColors, nbSpacing, nbTypography, nbBorders, nbBorderRadius, nbShadows } from '../../constants/nbTokens';
import type { Overtime, OvertimeStatus } from '../../types/models.types';

type TabKey = 'my' | 'approvals';

/**
 * Get status badge color based on overtime status
 */
function getStatusColor(status: OvertimeStatus): 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'approved':
      return 'success';
    case 'pending':
      return 'warning';
    case 'rejected':
      return 'danger';
    default:
      return 'warning';
  }
}

/**
 * Get status label in Indonesian
 */
function getStatusLabel(status: OvertimeStatus): string {
  switch (status) {
    case 'approved':
      return 'Disetujui';
    case 'pending':
      return 'Menunggu';
    case 'rejected':
      return 'Ditolak';
    default:
      return status;
  }
}

/**
 * Format date string to Indonesian format
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
 * Overtime Card Component
 */
interface OvertimeCardProps {
  overtime: Overtime;
  onPress: () => void;
}

function OvertimeCard({ overtime, onPress }: OvertimeCardProps): React.JSX.Element {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <NBCard style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardDate}>{formatDate(overtime.date)}</Text>
            <Text style={styles.cardTime}>
              {overtime.start_time} - {overtime.end_time}
            </Text>
          </View>
          <NBBadge
            color={getStatusColor(overtime.status)}
            text={getStatusLabel(overtime.status)}
          />
        </View>
        <View style={styles.cardContent}>
          {overtime.activityType && (
            <Text style={styles.activityType}>{overtime.activityType.name}</Text>
          )}
          {overtime.user && (
            <Text style={styles.userName}>{overtime.user.full_name}</Text>
          )}
        </View>
      </NBCard>
    </TouchableOpacity>
  );
}

/**
 * Overtime List Screen Component
 */
export const OvertimeListScreen: React.FC<MainTabScreenProps<'Overtime'>> = () => {
  const navigation = useNavigation<MainTabScreenProps<'Overtime'>['navigation']>();
  const dispatch = useAppDispatch();
  const { canApproveOvertime, canSubmitOvertime } = useRoleAccess();

  const myOvertimes = useAppSelector(selectMyOvertimes);
  const pendingApprovals = useAppSelector(selectPendingApprovals);
  const isLoading = useAppSelector(selectOvertimeLoading);

  const [activeTab, setActiveTab] = useState<TabKey>('my');
  const [refreshing, setRefreshing] = useState(false);

  // Build tabs array based on permissions
  const tabs = [
    { key: 'my', label: 'Pengajuan Saya' },
    ...(canApproveOvertime
      ? [{ key: 'approvals' as const, label: 'Menunggu Persetujuan', count: pendingApprovals.filter(o => o.status === 'pending').length }]
      : []),
  ];

  // Fetch data
  const fetchData = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      // Fetch user's own overtimes
      const myResponse = await getMyOvertimes();
      if (myResponse.data) {
        dispatch(setMyOvertimes(myResponse.data));
      } else if (myResponse.error) {
        dispatch(setError(myResponse.error));
      }

      // Fetch pending approvals if user can approve
      if (canApproveOvertime) {
        const approvalsResponse = await getPendingApprovals();
        if (approvalsResponse.data) {
          dispatch(setPendingApprovals(approvalsResponse.data));
        } else if (approvalsResponse.error) {
          dispatch(setError(approvalsResponse.error));
        }
      }
    } catch (error) {
      dispatch(setError('Gagal memuat data lembur'));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, canApproveOvertime]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // Navigate to detail
  const handleOvertimePress = useCallback(
    (overtimeId: string) => {
      navigation.navigate('OvertimeDetail', { overtimeId });
    },
    [navigation],
  );

  // Navigate to submit
  const handleSubmit = useCallback(() => {
    navigation.navigate('OvertimeSubmit');
  }, [navigation]);

  // Render item
  const renderItem = useCallback(
    ({ item }: { item: Overtime }) => (
      <OvertimeCard overtime={item} onPress={() => handleOvertimePress(item.id)} />
    ),
    [handleOvertimePress],
  );

  // Get data for active tab
  const data = activeTab === 'my' ? myOvertimes : pendingApprovals;

  return (
    <SafeAreaView style={styles.container}>
      <NBBackgroundPattern style={styles.background} />
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Lembur</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <NBTab
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(key) => setActiveTab(key as TabKey)}
          />
        </View>

        {/* List */}
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <NBEmptyState
              variant="noData"
              title="Tidak ada data"
              description={
                activeTab === 'my'
                  ? 'Belum ada pengajuan lembur'
                  : 'Tidak ada pengajuan yang menunggu persetujuan'
              }
            />
          }
        />

        {/* FAB - Submit button for roles that can submit overtime */}
        {canSubmitOvertime && (
          <View style={styles.fab}>
            <NBButton
              title="+ Ajukan Lembur"
              onPress={handleSubmit}
              variant="primary"
              size="lg"
            />
          </View>
        )}
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
  tabContainer: {
    paddingHorizontal: nbSpacing.md,
    paddingTop: nbSpacing.md,
  },
  listContent: {
    paddingHorizontal: nbSpacing.sm, // Reduced since cards have their own margins
    paddingTop: nbSpacing.md,
    paddingBottom: 80, // Reserve space for FAB (56px button + 16px margin + 8px buffer)
    flexGrow: 1,
  },
  card: {
    marginBottom: nbSpacing.md,
    marginHorizontal: nbSpacing.xs, // Add horizontal spacing between cards
    padding: nbSpacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: nbSpacing.sm,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardDate: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
    marginBottom: nbSpacing.xs,
  },
  cardTime: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray[600],
  },
  cardContent: {
    gap: nbSpacing.xs,
  },
  activityType: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.primary,
  },
  userName: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray[600],
  },
  fab: {
    position: 'absolute',
    bottom: nbSpacing.md,
    left: nbSpacing.md,
    right: nbSpacing.md,
    zIndex: 10,
  },
});
