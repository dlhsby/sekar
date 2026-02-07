/**
 * Worker Profile Screen
 * Displays user information, assigned area, monthly statistics, and logout
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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import EncryptedStorage from 'react-native-encrypted-storage';
import { NBButton, NBCard, NBBackgroundPattern } from '../../components/nb';
import { logout } from '../../store/slices/authSlice';
import { resetState as resetShiftState } from '../../store/slices/shiftSlice';
import { resetState as resetReportState } from '../../store/slices/reportSlice';
import { resetState as resetOfflineState } from '../../store/slices/offlineSlice';
import { getMe } from '../../services/api/authApi';
import { get } from '../../services/api/apiClient';
import {
  getPendingCount,
  getPendingCountsByType,
  getFailedCount,
  clearQueueForCurrentUser,
  retryFailedItems,
  clearFailedItems,
  clearOrphanedItems,
} from '../../services/sync/offlineQueue';
import { syncManager } from '../../services/sync/syncManager';
import { locationTracker } from '../../services/location/locationTracker';
import { nbColors, nbSpacing, nbTypography, nbBorderRadius, nbShadows, nbBorders } from '../../constants/nbTokens';
import { ChangePasswordModal } from '../../components/common';
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
 * Profile Screen Component
 */
export function ProfileScreen({ navigation }: any): React.JSX.Element {
  const dispatch = useDispatch();
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

      // Load shift history for statistics
      const shiftsResponse = await get<Shift[]>('/shifts/my-shifts');
      if (shiftsResponse.data) {
        calculateMonthlyStats(shiftsResponse.data);
      }

      // Load sync status
      await loadSyncStatus();
    } catch (error) {
      console.error('[ProfileScreen] Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadSyncStatus]);

  /**
   * Calculate statistics for current month
   */
  const calculateMonthlyStats = (shifts: Shift[]) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // Filter shifts from current month
    const monthlyShifts = shifts.filter((shift) => {
      const shiftDate = new Date(shift.clock_in_time);
      return (
        shiftDate.getMonth() === currentMonth &&
        shiftDate.getFullYear() === currentYear
      );
    });

    // Calculate days worked (unique dates)
    const uniqueDates = new Set(
      monthlyShifts.map((shift) =>
        new Date(shift.clock_in_time).toDateString()
      )
    );
    const daysWorked = uniqueDates.size;

    // Calculate total hours worked
    const totalHours = monthlyShifts.reduce((sum, shift) => {
      if (!shift.clock_out_time) {
        return sum;
      }

      const clockIn = new Date(shift.clock_in_time);
      const clockOut = new Date(shift.clock_out_time);
      const hours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

      return sum + hours;
    }, 0);

    // For now, reports count is estimated (would need to call reports API)
    const reportsCount = monthlyShifts.length * 3; // Rough estimate

    setMonthlyStats({
      daysWorked,
      totalHours: Math.round(totalHours * 10) / 10, // Round to 1 decimal
      reportsCount,
    });
  };

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
   * Fix: Use fresh values from async calls to avoid stale closure issues
   */
  const handleLogout = async () => {
    setIsLoading(true);
    try {
      // Get fresh values directly from async calls to avoid stale closure
      const [freshPending, freshFailed, freshPendingByType] = await Promise.all([
        getPendingCount(),
        getFailedCount(),
        getPendingCountsByType(),
      ]);
      const totalPending = freshPending + freshFailed;

      // Update sync status state for UI consistency
      setSyncStatus({
        pendingCount: freshPending,
        failedCount: freshFailed,
        pendingByType: freshPendingByType,
      });

      setIsLoading(false);

      if (totalPending > 0) {
        // Build pending description from fresh data
        const buildFreshPendingDescription = (): string => {
          const parts: string[] = [];
          if (freshPendingByType['clock-in'] > 0) {
            parts.push(`${freshPendingByType['clock-in']} clock-in`);
          }
          if (freshPendingByType['clock-out'] > 0) {
            parts.push(`${freshPendingByType['clock-out']} clock-out`);
          }
          if (freshPendingByType.report > 0) {
            parts.push(`${freshPendingByType.report} laporan`);
          }
          if (freshPendingByType.location > 0) {
            parts.push(`${freshPendingByType.location} lokasi`);
          }
          return parts.length > 0 ? parts.join(', ') : 'Tidak ada';
        };

        const description = buildFreshPendingDescription();
        const message = `Ada ${freshPending} data tertunda dan ${freshFailed} data gagal yang belum tersinkronisasi:\n\n${description}\n\nData ini akan hilang jika Anda keluar.`;

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
                // Add timeout to prevent infinite hanging (30 seconds)
                const syncWithTimeout = Promise.race([
                  syncManager.processQueue(),
                  new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Sync timeout')), 30000)
                  ),
                ]);

                await syncWithTimeout;
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
                if (error.message === 'Sync timeout') {
                  Alert.alert(
                    'Timeout',
                    'Sinkronisasi terlalu lama. Silakan coba lagi atau pilih "Keluar Saja".',
                    [{ text: 'OK' }]
                  );
                } else {
                  Alert.alert('Kesalahan', `Sinkronisasi gagal: ${error.message}`);
                }
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
      console.error('[ProfileScreen] Error during logout check:', error);
      setIsLoading(false);
      // Just logout if check fails
      await performLogout();
    }
  };

  /**
   * Perform the actual logout
   */
  const performLogout = async () => {
    try {
      // Stop location tracking
      if (locationTracker.isTracking()) {
        await locationTracker.stop();
      }

      // Clear tokens
      await EncryptedStorage.removeItem('auth_token');
      await EncryptedStorage.removeItem('refresh_token');

      // Clear queue items for current user
      await clearQueueForCurrentUser();
      
      // Clear orphaned items from previous sessions
      await clearOrphanedItems();

      // Clear non-auth Redux states first
      dispatch(resetShiftState());
      dispatch(resetReportState());
      dispatch(resetOfflineState());

      // Dispatch logout to clear auth state and trigger navigation
      // Note: logout() handles isAuthenticated, user, assignedArea, and isRestoring
      // No need to call resetAuthState() separately as it would set isRestoring: true temporarily
      dispatch(logout());
    } catch (error) {
      console.error('[ProfileScreen] Logout error:', error);
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
      case 'shift-history':
        navigation.navigate('ShiftHistory');
        break;
      case 'about':
        Alert.alert(
          'Tentang SEKAR',
          'Sistem Evaluasi Kerja Satgas RTH\n\nVersi: 1.0.0\nDLH Surabaya',
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

      {/* Assigned Area Card */}
      <NBCard variant="elevated" style={styles.card}>
        <Text style={styles.cardTitle}>Area Ditugaskan</Text>
        {assignedArea || profileData?.assigned_area ? (
          <View style={styles.areaInfo}>
            <Text style={styles.areaName}>
              {assignedArea?.name || profileData?.assigned_area?.name}
            </Text>
            <Text style={styles.areaType}>
              {assignedArea?.area_type?.name ||
                profileData?.assigned_area?.area_type?.name}{' '}
              - {assignedArea?.radius_meters ||
                profileData?.assigned_area?.radius_meters}m radius
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

      {/* Monthly Statistics Card */}
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

      {/* Menu Items */}
      <NBCard variant="elevated" style={styles.menuContainer}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleMenuPress('change-password')}
          activeOpacity={0.7}>
          <MaterialCommunityIcons
            name="lock-outline"
            size={24}
            color={nbColors.gray[600]}
            style={styles.menuIcon}
          />
          <Text style={styles.menuText}>Ubah Password</Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={nbColors.gray[600]}
          />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleMenuPress('shift-history')}
          activeOpacity={0.7}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={24}
            color={nbColors.gray[600]}
            style={styles.menuIcon}
          />
          <Text style={styles.menuText}>Riwayat Shift</Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={nbColors.gray[600]}
          />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleMenuPress('about')}
          activeOpacity={0.7}>
          <MaterialCommunityIcons
            name="information-outline"
            size={24}
            color={nbColors.gray[600]}
            style={styles.menuIcon}
          />
          <Text style={styles.menuText}>Tentang Aplikasi</Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={nbColors.gray[600]}
          />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.7}>
          <MaterialCommunityIcons
            name="cog-outline"
            size={24}
            color={nbColors.gray[600]}
            style={styles.menuIcon}
          />
          <Text style={styles.menuText}>Pengaturan</Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={nbColors.gray[600]}
          />
        </TouchableOpacity>
      </NBCard>

      {/* Logout Button */}
      <View style={styles.logoutButtonContainer}>
        <NBButton
          title="Keluar"
          onPress={handleLogout}
          variant="danger"
          fullWidth
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
    paddingVertical: nbSpacing.md, // 16px - reduced from lg (24px)
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

  // Header styles
  header: {
    alignItems: 'center',
    paddingVertical: nbSpacing.md, // 16px - reduced from xl (32px)
    backgroundColor: nbColors.white,
    marginBottom: nbSpacing.md,
    borderBottomWidth: nbBorders.base,
    borderBottomColor: nbColors.black,
    ...nbShadows.md,
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
    color: nbColors.gray[900],
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
    color: nbColors.gray[900],
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
    color: nbColors.gray[900],
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
    minWidth: 80,
    alignItems: 'center',
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
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

  // Area info styles
  areaInfo: {
    paddingTop: nbSpacing.xs,
  },
  areaName: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.gray[900],
    marginBottom: nbSpacing.xs,
  },
  areaType: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray[600],
    marginBottom: nbSpacing.xs,
  },
  areaAddress: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray[600],
    lineHeight: nbTypography.fontSize.sm * nbTypography.lineHeight.normal,
  },
  noArea: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray[500],
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: nbSpacing.md,
  },

  // Statistics styles
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: nbSpacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: nbBorders.base,
    height: 40,
    backgroundColor: nbColors.black,
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
  reportsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: nbSpacing.md,
    borderTopWidth: nbBorders.base,
    borderTopColor: nbColors.black,
  },
  reportsLabel: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray[600],
  },
  reportsValue: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.gray[900],
  },

  // Menu styles
  menuContainer: {
    backgroundColor: nbColors.white,
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    borderRadius: nbBorderRadius.base,
    overflow: 'hidden',
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nbSpacing.md,
    paddingHorizontal: nbSpacing.md,
  },
  menuIcon: {
    marginRight: nbSpacing.md,
  },
  menuText: {
    flex: 1,
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray[900],
  },
  menuArrow: {
    fontSize: nbTypography.fontSize['2xl'],
    color: nbColors.gray[600],
    fontWeight: nbTypography.fontWeight.bold,
  },
  menuDivider: {
    height: nbBorders.base,
    backgroundColor: nbColors.black,
    marginLeft: nbSpacing.md + nbSpacing.md + 24, // icon width (24) + margins
  },

  // Logout button styles
  logoutButtonContainer: {
    paddingHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
  },
  logoutText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.white,
  },

  // Bottom spacer
  bottomSpacer: {
    height: nbSpacing.xl + nbSpacing.lg, // Increased bottom spacing to prevent overflow
  },
});
