/**
 * Worker Profile Screen
 * Displays user information, assigned area, monthly statistics, and logout
 * Refactored to use shared profile components
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { NBButton, NBCard, NBBackgroundPattern } from '../../components/nb';
import { getMe } from '../../services/api/authApi';
import { get } from '../../services/api/apiClient';
import {
  getPendingCount,
  getPendingCountsByType,
  getFailedCount,
  retryFailedItems,
  clearFailedItems,
} from '../../services/sync/offlineQueue';
import { syncManager } from '../../services/sync/syncManager';
import { locationTracker } from '../../services/location/locationTracker';
import { nbColors, nbSpacing, nbTypography, nbBorderRadius, nbShadows, nbBorders } from '../../constants/nbTokens';
import {
  ChangePasswordModal,
  ProfileHeader,
  ProfileMenu,
  SyncStatusCard,
  type MenuItem,
  type SyncStatus,
} from '../../components/common';
import { useProfileLogout } from '../../hooks/useProfileLogout';
import type { RootState } from '../../store/store';
import type { Shift } from '../../types/models.types';

/**
 * Monthly statistics interface
 */
interface MonthlyStats {
  daysWorked: number;
  totalHours: number;
  reportsCount: number;
}

/**
 * Profile Screen Component
 */
export function ProfileScreen({ navigation }: any): React.JSX.Element {
  const { user, assignedArea } = useSelector((state: RootState) => state.auth);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isChangePasswordModalVisible, setIsChangePasswordModalVisible] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    daysWorked: 0,
    totalHours: 0,
    reportsCount: 0,
  });
  const [profileData, setProfileData] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    pendingCount: 0,
    failedCount: 0,
  });

  /**
   * Load sync status
   */
  const loadSyncStatus = useCallback(async () => {
    try {
      const [pendingCount, failedCount] = await Promise.all([
        getPendingCount(),
        getFailedCount(),
      ]);
      setSyncStatus({ pendingCount, failedCount });
    } catch (error) {
      console.error('[ProfileScreen] Error loading sync status:', error);
    }
  }, []);

  /**
   * Load profile data and statistics
   */
  const loadProfileData = useCallback(async () => {
    try {
      // Load user profile
      const profileResponse = await getMe();
      if (profileResponse.data) {
        setProfileData(profileResponse.data);
      }

      // Load monthly statistics
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const shiftsResponse = await get<{ data: Shift[]; meta: { total: number } }>(
        '/worker/shifts',
        {
          from_date: startOfMonth.toISOString().split('T')[0],
          to_date: endOfMonth.toISOString().split('T')[0],
        }
      );

      const shifts = shiftsResponse.data?.data || [];
      const daysWorked = shifts.filter((s: Shift) => s.clock_out_time).length;
      const totalHours = shifts.reduce((sum: number, s: Shift) => {
        if (s.clock_in_time && s.clock_out_time) {
          const clockIn = new Date(s.clock_in_time);
          const clockOut = new Date(s.clock_out_time);
          return sum + (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
        }
        return sum;
      }, 0);

      const reportsResponse = await get<{ data: any[]; meta: { total: number } }>(
        '/worker/reports',
        {
          from_date: startOfMonth.toISOString().split('T')[0],
          to_date: endOfMonth.toISOString().split('T')[0],
        }
      );

      setMonthlyStats({
        daysWorked,
        totalHours: Math.round(totalHours),
        reportsCount: reportsResponse.data?.meta?.total || 0,
      });

      // Load sync status
      await loadSyncStatus();
    } catch (error) {
      console.error('[ProfileScreen] Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadSyncStatus]);

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadProfileData();
    setIsRefreshing(false);
  }, [loadProfileData]);

  /**
   * Handle sync now
   */
  const handleSyncNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      await syncManager.processQueue();
      await loadSyncStatus();
      Alert.alert('Sinkronisasi', 'Data berhasil disinkronkan');
    } catch (error: any) {
      Alert.alert('Kesalahan', `Gagal sinkronisasi: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  }, [loadSyncStatus]);

  /**
   * Handle retry failed items
   */
  const handleRetryFailed = useCallback(async () => {
    try {
      const count = await retryFailedItems();
      if (count > 0) {
        Alert.alert('Berhasil', `${count} item akan dicoba ulang`);
        await syncManager.processQueue();
        await loadSyncStatus();
      } else {
        Alert.alert('Info', 'Tidak ada item gagal untuk dicoba ulang');
      }
    } catch (error: any) {
      Alert.alert('Kesalahan', `Gagal mencoba ulang: ${error.message}`);
    }
  }, [loadSyncStatus]);

  /**
   * Handle clear failed items
   */
  const handleClearFailed = useCallback(async () => {
    Alert.alert(
      'Hapus Item Gagal?',
      'Data yang gagal akan dihapus permanen dan tidak dapat dikembalikan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearFailedItems();
              await loadSyncStatus();
              Alert.alert('Berhasil', 'Item gagal telah dihapus');
            } catch (error: any) {
              Alert.alert('Kesalahan', `Gagal menghapus: ${error.message}`);
            }
          },
        },
      ]
    );
  }, [loadSyncStatus]);

  /**
   * Handle menu press
   */
  const handleMenuPress = useCallback((menu: string) => {
    switch (menu) {
      case 'change-password':
        setIsChangePasswordModalVisible(true);
        break;
      case 'shift-history':
        navigation.navigate('ShiftHistory');
        break;
      case 'about':
        Alert.alert(
          'Tentang SEKAR',
          'Sistem Evaluasi Kerja Satgas RTH\n\nVersi: 1.0.0\nDLH Surabaya © 2026',
          [{ text: 'OK' }]
        );
        break;
    }
  }, [navigation]);

  /**
   * Use shared logout hook with location tracking cleanup
   */
  const { handleLogout } = useProfileLogout({
    onBeforeLogout: async () => {
      // Stop location tracking if active
      if (locationTracker.isTracking()) {
        await locationTracker.stop();
      }
    },
    setIsLoading,
    onSyncStatusUpdate: (status) => {
      setSyncStatus({
        pendingCount: status.pendingCount,
        failedCount: status.failedCount,
      });
    },
  });

  // Load data on mount
  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  // Show loading state
  if (isLoading) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <Text style={styles.loadingText}>Memuat profil...</Text>
        </View>
      </NBBackgroundPattern>
    );
  }

  // Build extra menu items for worker (Shift History)
  const extraMenuItems: MenuItem[] = [
    {
      key: 'shift-history',
      icon: 'clock-outline',
      label: 'Riwayat Shift',
      onPress: () => handleMenuPress('shift-history'),
      testID: 'shift-history-button',
    },
  ];

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.background}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[nbColors.primary]}
            tintColor={nbColors.primary}
          />
        }>
        {/* Profile Header - Shared Component */}
        <ProfileHeader user={user} testID="worker-profile-header" />

        {/* Sync Status Card - Shared Component */}
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={isSyncing}
          onSyncNow={handleSyncNow}
          onRetryFailed={handleRetryFailed}
          onClearFailed={handleClearFailed}
          testID="worker-sync-status"
        />

        {/* Area Info Card - Worker Specific */}
        <NBCard variant="elevated" style={styles.card}>
          <Text style={styles.cardTitle}>Area Ditugaskan</Text>
          {assignedArea || profileData?.assigned_area ? (
            <View style={styles.areaInfo}>
              <Text style={styles.areaName}>
                {assignedArea?.name || profileData?.assigned_area?.name}
              </Text>
              <Text style={styles.areaType}>
                {assignedArea?.area_type?.name || profileData?.assigned_area?.area_type?.name} -{' '}
                {assignedArea?.radius_meters || profileData?.assigned_area?.radius_meters}m radius
              </Text>
              {(assignedArea?.address || profileData?.assigned_area?.address) && (
                <Text style={styles.areaAddress} numberOfLines={2}>
                  {assignedArea?.address || profileData?.assigned_area?.address}
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.noArea}>Tidak ada area ditugaskan</Text>
          )}
        </NBCard>

        {/* Monthly Statistics Card - Worker Specific */}
        <NBCard variant="elevated" style={styles.card}>
          <Text style={styles.cardTitle}>Statistik Bulan Ini</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{monthlyStats.daysWorked}</Text>
              <Text style={styles.statLabel}>Hari Kerja</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{monthlyStats.totalHours}</Text>
              <Text style={styles.statLabel}>Jam Kerja</Text>
            </View>
          </View>
          <View style={styles.reportsRow}>
            <Text style={styles.reportsLabel}>Laporan:</Text>
            <Text style={styles.reportsValue}>{monthlyStats.reportsCount}</Text>
          </View>
        </NBCard>

        {/* Profile Menu - Shared Component with Worker-specific items */}
        <ProfileMenu
          extraItems={extraMenuItems}
          onChangePassword={() => handleMenuPress('change-password')}
          onAbout={() => handleMenuPress('about')}
          testID="worker-profile-menu"
        />

        {/* Logout Button - Using shared hook */}
        <View style={styles.logoutContainer}>
          <NBButton
            title="🚪 Keluar"
            onPress={handleLogout}
            variant="danger"
            fullWidth
            testID="logout-button"
          />
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />

        {/* Change Password Modal */}
        <ChangePasswordModal
          visible={isChangePasswordModalVisible}
          onClose={() => setIsChangePasswordModalVisible(false)}
        />
      </ScrollView>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingVertical: nbSpacing.md,
    flexGrow: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: nbSpacing.md,
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray[600],
  },

  // Card styles
  card: {
    backgroundColor: nbColors.white,
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    padding: nbSpacing.md,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  cardTitle: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
    marginBottom: nbSpacing.md,
  },

  // Area info styles
  areaInfo: {
    gap: nbSpacing.xs,
  },
  areaName: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
  },
  areaType: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray[600],
  },
  areaAddress: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray[600],
    fontStyle: 'italic',
  },
  noArea: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray[600],
    fontStyle: 'italic',
  },

  // Statistics styles
  statsContainer: {
    flexDirection: 'row',
    marginBottom: nbSpacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: nbTypography.fontSize['3xl'],
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.primary,
    marginBottom: nbSpacing.xs,
  },
  statLabel: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray[600],
    textAlign: 'center',
  },
  statDivider: {
    width: nbBorders.thin,
    backgroundColor: nbColors.black,
    marginHorizontal: nbSpacing.md,
  },
  reportsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: nbSpacing.md,
    borderTopWidth: nbBorders.thin,
    borderTopColor: nbColors.black,
  },
  reportsLabel: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray[600],
  },
  reportsValue: {
    fontSize: nbTypography.fontSize.xl,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.primary,
  },

  // Logout button styles
  logoutContainer: {
    paddingHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
  },

  // Bottom spacer
  bottomSpacer: {
    height: nbSpacing.xl,
  },
});
