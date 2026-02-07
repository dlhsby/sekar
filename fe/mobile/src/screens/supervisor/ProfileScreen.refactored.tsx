/**
 * Supervisor Profile Screen
 * Displays supervisor information, managed workers/areas statistics, and logout
 * Refactored to use shared profile components
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { NBButton, NBCard, NBBackgroundPattern } from '../../components/nb';
import { getMe } from '../../services/api/authApi';
import { getActiveWorkers } from '../../services/api/supervisorApi';
import { get } from '../../services/api/apiClient';
import {
  getPendingCount,
  getFailedCount,
  retryFailedItems,
  clearFailedItems,
} from '../../services/sync/offlineQueue';
import { syncManager } from '../../services/sync/syncManager';
import {
  nbColors,
  nbTypography,
  nbSpacing,
  nbBorderRadius,
  nbShadows,
  nbBorders,
} from '../../constants/nbTokens';
import {
  ChangePasswordModal,
  ProfileHeader,
  ProfileMenu,
  SyncStatusCard,
  type SyncStatus,
} from '../../components/common';
import { useProfileLogout } from '../../hooks/useProfileLogout';
import type { RootState } from '../../store/store';

/**
 * Area status from API
 */
interface AreaStatusDto {
  id: string;
  name: string;
  assigned_workers_count: number;
  active_workers_count: number;
}

interface AreaStatusResponse {
  areas: AreaStatusDto[];
}

/**
 * Supervisor statistics interface
 */
interface SupervisorStats {
  totalWorkersManaged: number;
  totalAreasMonitored: number;
  reportsReviewedThisMonth: number;
}

/**
 * Profile Screen Component for Supervisors
 */
export function ProfileScreen({ navigation }: any): React.JSX.Element {
  const { user } = useSelector((state: RootState) => state.auth);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isChangePasswordModalVisible, setIsChangePasswordModalVisible] = useState(false);
  const [supervisorStats, setSupervisorStats] = useState<SupervisorStats>({
    totalWorkersManaged: 0,
    totalAreasMonitored: 0,
    reportsReviewedThisMonth: 0,
  });
  const [_profileData, setProfileData] = useState<any>(null);
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
      console.error('[SupervisorProfileScreen] Error loading sync status:', error);
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

      // Load active workers count (limit is capped to 100 by the API)
      const workersResponse = await getActiveWorkers(1, 100);
      const workersCount = workersResponse.data?.meta?.total || 0;

      // Load area status to get areas count
      const areaStatusResponse = await get<AreaStatusResponse>('/supervisor/area-status');
      const areasCount = areaStatusResponse.data?.areas?.length || 0;

      // Load reports count for current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      // Format dates as YYYY-MM-DD (backend expects this format, not ISO strings)
      const formatDateParam = (d: Date): string => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const reportsResponse = await get<{ data: any[]; meta: { total: number } }>(
        '/reports',
        {
          from_date: formatDateParam(startOfMonth),
          to_date: formatDateParam(endOfMonth),
          page: 1,
          limit: 1, // We only need the total count from meta
        }
      );
      const reportsCount = reportsResponse.data?.meta?.total || 0;

      setSupervisorStats({
        totalWorkersManaged: workersCount,
        totalAreasMonitored: areasCount,
        reportsReviewedThisMonth: reportsCount,
      });

      // Load sync status
      await loadSyncStatus();
    } catch (error) {
      console.error('[SupervisorProfileScreen] Error loading profile:', error);
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
   * Handle menu item press
   */
  const handleMenuPress = useCallback((menu: string) => {
    switch (menu) {
      case 'change-password':
        setIsChangePasswordModalVisible(true);
        break;
      case 'about':
        Alert.alert(
          'Tentang SEKAR',
          'Sistem Evaluasi Kerja Satgas RTH\n\nVersi: 1.0.0\nDLH Surabaya © 2026',
          [{ text: 'OK' }]
        );
        break;
      case 'settings':
        navigation.navigate('Settings');
        break;
    }
  }, [navigation]);

  /**
   * Use shared logout hook (no location tracking for supervisors)
   */
  const { handleLogout } = useProfileLogout({
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

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.background}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <ScrollView
        testID="ProfileScrollView"
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
        <ProfileHeader user={user} testID="supervisor-profile-header" />

        {/* Sync Status Card - Shared Component */}
        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={isSyncing}
          onSyncNow={handleSyncNow}
          onRetryFailed={handleRetryFailed}
          onClearFailed={handleClearFailed}
          testID="supervisor-sync-status"
        />

        {/* Supervisor Statistics Card - Supervisor Specific */}
        <NBCard variant="elevated" style={styles.card}>
          <Text style={styles.cardTitle}>📊 Ringkasan</Text>
          <View style={styles.statsRow}>
            <Text style={styles.statsIcon}>👷</Text>
            <Text style={styles.statsLabel}>Pekerja aktif</Text>
            <Text style={styles.statsValue}>{supervisorStats.totalWorkersManaged}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statsRow}>
            <Text style={styles.statsIcon}>📍</Text>
            <Text style={styles.statsLabel}>Area dikelola</Text>
            <Text style={styles.statsValue}>{supervisorStats.totalAreasMonitored}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statsRow}>
            <Text style={styles.statsIcon}>📝</Text>
            <Text style={styles.statsLabel}>Laporan bulan ini</Text>
            <Text style={styles.statsValue}>{supervisorStats.reportsReviewedThisMonth}</Text>
          </View>
        </NBCard>

        {/* Profile Menu - Shared Component with Settings */}
        <ProfileMenu
          onChangePassword={() => handleMenuPress('change-password')}
          onAbout={() => handleMenuPress('about')}
          onSettings={() => handleMenuPress('settings')}
          testID="supervisor-profile-menu"
        />

        {/* Logout Button - Using shared hook with fullWidth to fix overflow */}
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
    paddingVertical: nbSpacing.lg,
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

  // Statistics styles
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nbSpacing.sm,
  },
  statsIcon: {
    fontSize: nbTypography.fontSize.xl,
    marginRight: nbSpacing.sm,
    width: 28,
  },
  statsLabel: {
    flex: 1,
    fontSize: nbTypography.fontSize.base,
    color: nbColors.black,
  },
  statsValue: {
    fontSize: nbTypography.fontSize.xl,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.primary,
  },
  statDivider: {
    height: nbBorders.thin,
    backgroundColor: nbColors.black,
    marginLeft: nbSpacing.sm + 28,
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
