/**
 * Supervisor Profile Screen
 * Displays supervisor information, managed workers/areas statistics, and logout
 * With enhanced logout flow that handles pending sync items
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import EncryptedStorage from 'react-native-encrypted-storage';
import { logout, resetState as resetAuthState } from '../../store/slices/authSlice';
import { resetState as resetShiftState } from '../../store/slices/shiftSlice';
import { resetState as resetReportState } from '../../store/slices/reportSlice';
import { resetState as resetOfflineState } from '../../store/slices/offlineSlice';
import { getMe } from '../../services/api/authApi';
import { getActiveWorkers } from '../../services/api/supervisorApi';
import { get } from '../../services/api/apiClient';
import {
  getPendingCount,
  getPendingCountsByType,
  getFailedCount,
  clearQueueForCurrentUser,
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
import { ChangePasswordModal } from '../../components/common';
import { NBButton, NBCard, NBBackgroundPattern } from '../../components/nb';
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
 * Sync status interface
 */
interface SyncStatus {
  pendingCount: number;
  failedCount: number;
  pendingByType: {
    'clock-in': number;
    'clock-out': number;
    report: number;
    location: number;
  };
}

/**
 * Profile Screen Component for Supervisors
 */
export function ProfileScreen({ navigation }: any): React.JSX.Element {
  const dispatch = useDispatch();
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
    pendingByType: {
      'clock-in': 0,
      'clock-out': 0,
      report: 0,
      location: 0,
    },
  });

  /**
   * Load sync status
   */
  const loadSyncStatus = useCallback(async () => {
    try {
      const [pendingCount, failedCount, pendingByType] = await Promise.all([
        getPendingCount(),
        getFailedCount(),
        getPendingCountsByType(),
      ]);
      setSyncStatus({ pendingCount, failedCount, pendingByType });
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
   * Build pending items description
   */
  const buildPendingDescription = (): string => {
    const { pendingByType } = syncStatus;
    const parts: string[] = [];

    if (pendingByType['clock-in'] > 0) {
      parts.push(`${pendingByType['clock-in']} clock-in`);
    }
    if (pendingByType['clock-out'] > 0) {
      parts.push(`${pendingByType['clock-out']} clock-out`);
    }
    if (pendingByType.report > 0) {
      parts.push(`${pendingByType.report} laporan`);
    }
    if (pendingByType.location > 0) {
      parts.push(`${pendingByType.location} lokasi`);
    }

    return parts.length > 0 ? parts.join(', ') : 'Tidak ada';
  };

  /**
   * Handle logout with enhanced confirmation
   */
  const handleLogout = async () => {
    try {
      await loadSyncStatus();
      const { pendingCount, failedCount } = syncStatus;
      const totalPending = pendingCount + failedCount;

      if (totalPending > 0) {
        // Show detailed pending breakdown with 3 options
        const description = buildPendingDescription();
        const message = `Ada ${pendingCount} data tertunda dan ${failedCount} data gagal yang belum tersinkronisasi:\n\n${description}\n\nData ini akan hilang jika Anda keluar.`;

        Alert.alert('Data Belum Tersinkronisasi', message, [
          {
            text: 'Batal',
            style: 'cancel',
          },
          {
            text: 'Sinkronkan Dulu',
            onPress: async () => {
              setIsSyncing(true);
              try {
                await syncManager.processQueue();
                await loadSyncStatus();

                // Check if still has pending items
                const newPending = await getPendingCount();
                const newFailed = await getFailedCount();

                if (newPending + newFailed === 0) {
                  // All synced, proceed with logout
                  await performLogout();
                } else {
                  Alert.alert(
                    'Sinkronisasi Belum Selesai',
                    `Masih ada ${newPending + newFailed} data yang gagal tersinkronisasi. Silakan coba lagi atau pilih "Keluar Saja".`,
                    [{ text: 'OK' }]
                  );
                }
              } catch (error: any) {
                Alert.alert('Kesalahan', `Sinkronisasi gagal: ${error.message}`);
              } finally {
                setIsSyncing(false);
              }
            },
          },
          {
            text: 'Keluar Saja',
            style: 'destructive',
            onPress: async () => {
              // Clear queue for current user and logout
              await clearQueueForCurrentUser();
              await performLogout();
            },
          },
        ]);
      } else {
        // No pending items, simple logout confirmation
        Alert.alert('Keluar dari Akun?', 'Anda akan keluar dari aplikasi SEKAR', [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Keluar',
            style: 'destructive',
            onPress: performLogout,
          },
        ]);
      }
    } catch (error) {
      console.error('[SupervisorProfileScreen] Error during logout check:', error);
      // Just logout if check fails
      await performLogout();
    }
  };

  /**
   * Perform the actual logout
   */
  const performLogout = async () => {
    try {
      // Clear tokens
      await EncryptedStorage.removeItem('auth_token');
      await EncryptedStorage.removeItem('refresh_token');

      // Clear all Redux states
      dispatch(resetAuthState());
      dispatch(resetShiftState());
      dispatch(resetReportState());
      dispatch(resetOfflineState());

      // Dispatch logout last to trigger navigation
      dispatch(logout());
    } catch (error) {
      console.error('[SupervisorProfileScreen] Logout error:', error);
      Alert.alert('Kesalahan', 'Gagal keluar dari aplikasi');
    }
  };

  /**
   * Handle menu item press
   */
  const handleMenuPress = (menu: string) => {
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
    }
  };

  /**
   * Get user initials for avatar
   */
  const getUserInitials = () => {
    if (!user?.full_name) {
      return '??';
    }
    const names = user.full_name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.full_name.substring(0, 2).toUpperCase();
  };

  /**
   * Get role badge text
   */
  const getRoleBadge = () => {
    switch (user?.role) {
      case 'worker':
        return 'Pekerja';
      case 'supervisor':
        return 'Supervisor';
      case 'admin':
        return 'Admin';
      default:
        return 'Pengguna';
    }
  };

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

  const hasPendingItems = syncStatus.pendingCount > 0 || syncStatus.failedCount > 0;

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
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getUserInitials()}</Text>
          </View>
        </View>
        <Text style={styles.fullName}>{user?.full_name || 'Pengguna'}</Text>
        <Text style={styles.username}>@{user?.username || 'unknown'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{getRoleBadge()}</Text>
        </View>
      </View>

      {/* Sync Status Card (only show if has pending items) */}
      {hasPendingItems && (
        <NBCard variant="elevated" style={styles.card}>
          <Text style={styles.cardTitle}>Sinkronisasi Data</Text>
          <View style={styles.syncStatusRow}>
            <Text style={styles.syncLabel}>Tertunda:</Text>
            <Text style={[styles.syncValue, syncStatus.pendingCount > 0 && styles.syncWarning]}>
              {syncStatus.pendingCount}
            </Text>
          </View>
          <View style={styles.syncStatusRow}>
            <Text style={styles.syncLabel}>Gagal:</Text>
            <Text style={[styles.syncValue, syncStatus.failedCount > 0 && styles.syncError]}>
              {syncStatus.failedCount}
            </Text>
          </View>
          <View style={styles.syncButtons}>
            <NBButton
              title="Sinkronkan"
              onPress={handleSyncNow}
              disabled={isSyncing}
              loading={isSyncing}
              variant="primary"
              size="sm"
            />
            {syncStatus.failedCount > 0 && (
              <>
                <NBButton
                  title="Coba Ulang"
                  onPress={handleRetryFailed}
                  variant="secondary"
                  size="sm"
                />
                <NBButton
                  title="Hapus Gagal"
                  onPress={handleClearFailed}
                  variant="danger"
                  size="sm"
                />
              </>
            )}
          </View>
        </NBCard>
      )}

      {/* Supervisor Statistics Card */}
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

      {/* Menu Items */}
      <NBCard variant="elevated" style={styles.menuContainer}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleMenuPress('change-password')}
          activeOpacity={0.7}>
          <Text style={styles.menuIcon}>🔑</Text>
          <Text style={styles.menuText}>Ubah password</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleMenuPress('about')}
          activeOpacity={0.7}>
          <Text style={styles.menuIcon}>ℹ️</Text>
          <Text style={styles.menuText}>Tentang aplikasi</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.7}>
          <Text style={styles.menuIcon}>⚙️</Text>
          <Text style={styles.menuText}>Pengaturan</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </NBCard>

      {/* Logout Button */}
      <NBButton
        title="🚪 Keluar"
        onPress={handleLogout}
        variant="danger"
        fullWidth
        style={styles.logoutButton}
      />

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

  // Header styles
  header: {
    alignItems: 'center',
    paddingVertical: nbSpacing.xl,
    backgroundColor: nbColors.white,
    marginBottom: nbSpacing.md,
    borderBottomWidth: nbBorders.base,
    borderBottomColor: nbColors.black,
  },
  avatarContainer: {
    marginBottom: nbSpacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: nbBorderRadius.full,
    backgroundColor: nbColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    ...nbShadows.md,
  },
  avatarText: {
    fontSize: nbTypography.fontSize['3xl'],
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.white,
  },
  fullName: {
    fontSize: nbTypography.fontSize.xl,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    marginBottom: nbSpacing.xs,
  },
  username: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray[600],
    marginBottom: nbSpacing.sm,
  },
  roleBadge: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.xs,
    backgroundColor: nbColors.primary,
    borderRadius: nbBorderRadius.sm,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
  },
  roleBadgeText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.white,
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

  // Sync status styles
  syncStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: nbSpacing.xs,
  },
  syncLabel: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray[600],
  },
  syncValue: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
  },
  syncWarning: {
    color: nbColors.warning,
  },
  syncError: {
    color: nbColors.danger,
  },
  syncButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: nbSpacing.md,
    gap: nbSpacing.sm,
  },
  syncButton: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    backgroundColor: nbColors.primary,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    minWidth: 80,
    alignItems: 'center',
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonSecondary: {
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
  },
  syncButtonDanger: {
    backgroundColor: nbColors.danger,
  },
  syncButtonText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.white,
  },
  syncButtonTextSecondary: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.primary,
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

  // Menu styles
  menuContainer: {
    backgroundColor: nbColors.white,
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    overflow: 'hidden',
    ...nbShadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nbSpacing.md,
    paddingHorizontal: nbSpacing.md,
  },
  menuIcon: {
    fontSize: nbTypography.fontSize.xl,
    marginRight: nbSpacing.md,
  },
  menuText: {
    flex: 1,
    fontSize: nbTypography.fontSize.base,
    color: nbColors.black,
  },
  menuArrow: {
    fontSize: nbTypography.fontSize['2xl'],
    color: nbColors.gray[600],
    fontWeight: nbTypography.fontWeight.bold,
  },
  menuDivider: {
    height: nbBorders.thin,
    backgroundColor: nbColors.black,
    marginLeft: nbSpacing.md + nbSpacing.md + nbTypography.fontSize.xl,
  },

  // Logout button styles
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nbColors.danger,
    marginHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  logoutIcon: {
    fontSize: nbTypography.fontSize.xl,
    marginRight: nbSpacing.sm,
  },
  logoutText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.white,
  },

  // Bottom spacer
  bottomSpacer: {
    height: nbSpacing.xl,
  },
});
