/**
 * Unified Profile Screen
 * Single screen for all 8 roles, renders role-appropriate stats
 * Phase 2C: replaces field/ProfileScreen + monitoring/ProfileScreen
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { NBButton, NBBackgroundPattern, NBModal, NBText } from '../../components/nb';
import { ProfileHeader } from '../../components/common/ProfileHeader';
import { ProfileMenu } from '../../components/common/ProfileMenu';
import { SyncStatusCard } from '../../components/common/SyncStatusCard';
import { FieldStatsCard } from '../../components/profile/FieldStatsCard';
import { MonitoringStatsCard } from '../../components/profile/MonitoringStatsCard';
import { AssignedAreaCard } from '../../components/profile/AssignedAreaCard';
import { AssignedKecamatanCard } from '../../components/profile/AssignedKecamatanCard';
import { getRayons } from '../../services/api/rayonsApi';
import { ChangePasswordModal } from '../../components/common';
import { useProfileData } from '../../hooks/useProfileData';
import { useProfileSync } from '../../hooks/useProfileSync';
import { useProfileLogout } from '../../hooks/useProfileLogout';
import { locationTracker } from '../../services/location/locationTracker';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import type { MenuItem } from '../../components/common/ProfileMenu';

export function ProfileScreen({ navigation }: any): React.JSX.Element {
  const {
    user,
    assignedArea,
    profileData,
    isField,
    isStaffKecamatan,
    isLoading,
    setIsLoading,
    fieldStats,
    monitoringStats,
    loadData,
  } = useProfileData();

  const {
    syncStatus,
    isSyncing,
    loadSyncStatus,
    handleSyncNow,
    handleRetryFailed,
    handleClearFailed,
  } = useProfileSync();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isChangePasswordModalVisible, setIsChangePasswordModalVisible] = useState(false);
  const [isAboutModalVisible, setIsAboutModalVisible] = useState(false);

  const { handleLogout } = useProfileLogout({
    onBeforeLogout: async () => {
      if (locationTracker.isTracking()) {
        await locationTracker.stop();
      }
    },
    setIsLoading,
    onSyncStatusUpdate: () => loadSyncStatus(),
  });

  const loadProfileData = useCallback(async () => {
    await loadData();
    await loadSyncStatus();
  }, [loadData, loadSyncStatus]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadProfileData();
    setIsRefreshing(false);
  }, [loadProfileData]);

  const handleAbout = useCallback(() => {
    setIsAboutModalVisible(true);
  }, []);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  // Resolve rayon name for the staff_kecamatan card. /auth/me only emits
  // rayon_id, so fetch the rayon list lazily and look up the display name.
  // (Declared above the isLoading early-return to keep hook order stable.)
  const [rayonName, setRayonName] = useState<string | null>(null);
  useEffect(() => {
    if (!isStaffKecamatan || !user?.rayon_id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getRayons();
        if (cancelled || !res || !res.data) return;
        const match = res.data.find((r: { id: string; name: string }) => r.id === user.rayon_id);
        if (match) setRayonName(match.name);
      } catch {
        /* non-critical — card will show "—" if the lookup fails */
      }
    })();
    return () => { cancelled = true; };
  }, [isStaffKecamatan, user?.rayon_id]);

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
          <NBText variant="body" color="gray600" style={styles.loadingText}>
            Memuat profil...
          </NBText>
        </View>
      </NBBackgroundPattern>
    );
  }

  const extraMenuItems: MenuItem[] = [
    {
      key: 'edit-profile',
      icon: 'account-edit-outline',
      label: 'Edit Profil',
      onPress: () => navigation.navigate('EditProfile'),
      testID: 'edit-profile-button',
    },
    ...(isField
      ? [
          {
            key: 'shift-history',
            icon: 'clock-outline',
            label: 'Riwayat Shift',
            onPress: () => navigation.navigate('ShiftHistory'),
            testID: 'shift-history-button',
          },
        ]
      : []),
  ];

  const areaData = assignedArea || profileData?.assigned_area || null;

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
        }
      >
        <ProfileHeader user={user} />

        <SyncStatusCard
          syncStatus={syncStatus}
          isSyncing={isSyncing}
          onSyncNow={handleSyncNow}
          onRetryFailed={handleRetryFailed}
          onClearFailed={handleClearFailed}
        />

        {isField && <AssignedAreaCard area={areaData} />}
        {isStaffKecamatan && (
          <AssignedKecamatanCard
            rayonName={rayonName}
            kecamatanName={user?.kecamatan_name ?? null}
          />
        )}

        {isField ? (
          <FieldStatsCard stats={fieldStats} />
        ) : isStaffKecamatan ? null : (
          <MonitoringStatsCard stats={monitoringStats} />
        )}

        <ProfileMenu
          extraItems={extraMenuItems}
          onChangePassword={() => setIsChangePasswordModalVisible(true)}
          onAbout={handleAbout}
          onSettings={() => navigation.navigate('Settings')}
        />

        <View style={styles.logoutButtonContainer}>
          <NBButton
            title="Keluar"
            onPress={handleLogout}
            variant="danger"
            fullWidth
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <ChangePasswordModal
        visible={isChangePasswordModalVisible}
        onClose={() => setIsChangePasswordModalVisible(false)}
      />

      <NBModal
        visible={isAboutModalVisible}
        onClose={() => setIsAboutModalVisible(false)}
        title="Tentang SEKAR"
      >
        <NBText variant="body" style={{ marginBottom: 8 }}>
          Sistem Evaluasi Kerja Satgas RTH
        </NBText>
        <NBText variant="body-sm" color="gray500">Versi: 1.0.0</NBText>
        <NBText variant="body-sm" color="gray500">DLH Kota Surabaya</NBText>
      </NBModal>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: nbSpacing.md,
  },
  logoutButtonContainer: {
    paddingHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
  },
  bottomSpacer: {
    height: nbSpacing.xl + nbSpacing.lg,
  },
});
