/**
 * Unified Profile Screen
 * Single screen for all 8 roles, renders role-appropriate stats
 * Phase 2C: replaces field/ProfileScreen + monitoring/ProfileScreen
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { NBButton, NBBackgroundPattern, NBModal, NBText } from '../../components/nb';
import { ProfileHeader } from '../../components/common/ProfileHeader';
import { ProfileMenu } from '../../components/common/ProfileMenu';
import { SyncStatusCard } from '../../components/common/SyncStatusCard';
import { FieldStatsCard } from '../../components/profile/FieldStatsCard';
import { MonitoringStatsCard } from '../../components/profile/MonitoringStatsCard';
import { AssignedAreaCard } from '../../components/profile/AssignedAreaCard';
import { ChangePasswordModal } from '../../components/common';
import { useProfileData } from '../../hooks/useProfileData';
import { useProfileSync } from '../../hooks/useProfileSync';
import { useProfileLogout } from '../../hooks/useProfileLogout';
import { locationTracker } from '../../services/location/locationTracker';
import { nbColors, nbSpacing, nbTypography } from '../../constants/nbTokens';
import type { MenuItem } from '../../components/common/ProfileMenu';

export function ProfileScreen({ navigation }: any): React.JSX.Element {
  const {
    user,
    assignedArea,
    profileData,
    isField,
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

        {isField ? (
          <FieldStatsCard stats={fieldStats} />
        ) : (
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

        <ChangePasswordModal
          visible={isChangePasswordModalVisible}
          onClose={() => setIsChangePasswordModalVisible(false)}
        />
      </ScrollView>

      <NBModal
        visible={isAboutModalVisible}
        onClose={() => setIsAboutModalVisible(false)}
        title="Tentang SEKAR"
        size="sm"
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
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray['600'],
  },
  logoutButtonContainer: {
    paddingHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
  },
  bottomSpacer: {
    height: nbSpacing.xl + nbSpacing.lg,
  },
});
