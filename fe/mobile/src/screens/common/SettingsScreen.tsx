/**
 * Settings Screen
 * App settings and preferences with NB 2.0 design system
 *
 * Features:
 * - Notification preferences
 * - Display settings (theme, font size)
 * - Privacy settings (location, analytics)
 * - Account actions (change password, logout)
 *
 * @see specs/ui-ux/neo-brutalism.md
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useDispatch } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import DeviceInfo from 'react-native-device-info';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { NBCard, NBBackgroundPattern, NBAlert } from '../../components/nb';
import { logout } from '../../store/slices/authSlice';
import { resetState as resetShiftState } from '../../store/slices/shiftSlice';
import { resetState as resetActivitiesState } from '../../store/slices/activitiesSlice';
import { resetState as resetOfflineState } from '../../store/slices/offlineSlice';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbBorderRadius,
  nbTouchTarget,
} from '../../constants/nbTokens';

/**
 * Settings section interface
 */
interface SettingItem {
  key: string;
  label: string;
  description?: string;
  type: 'toggle' | 'button' | 'navigation';
  value?: boolean;
  icon: string;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  danger?: boolean;
}

/**
 * Screen props type - works with all 8 roles via unified MainNavigator
 */
type SettingsScreenProps = NativeStackScreenProps<{ Settings: undefined }, 'Settings'>;

/**
 * Settings Screen Component
 */
export function SettingsScreen(_props: SettingsScreenProps): React.JSX.Element {
  const dispatch = useDispatch();

  // State for toggles
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [locationBackground, setLocationBackground] = useState(true);
  const [analytics, setAnalytics] = useState(false);

  // Modal states
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);

  // App info
  const appVersion = DeviceInfo.getVersion();
  const buildNumber = DeviceInfo.getBuildNumber();

  /**
   * Handle logout
   */
  const handleLogout = useCallback(() => {
    setShowLogoutAlert(true);
  }, []);

  /**
   * Confirm logout
   */
  const confirmLogout = useCallback(() => {
    setShowLogoutAlert(false);
    // Reset all states
    dispatch(resetShiftState());
    dispatch(resetActivitiesState());
    dispatch(resetOfflineState());
    dispatch(logout());
  }, [dispatch]);

  /**
   * Settings sections configuration
   */
  const notificationSettings: SettingItem[] = [
    {
      key: 'push',
      label: 'Notifikasi Push',
      description: 'Terima notifikasi untuk tugas dan pengingat',
      type: 'toggle',
      value: pushNotifications,
      icon: 'bell',
      onToggle: setPushNotifications,
    },
    {
      key: 'email',
      label: 'Notifikasi Email',
      description: 'Terima ringkasan harian via email',
      type: 'toggle',
      value: emailNotifications,
      icon: 'email',
      onToggle: setEmailNotifications,
    },
  ];

  const displaySettings: SettingItem[] = [
    {
      key: 'darkMode',
      label: 'Mode Gelap',
      description: 'Gunakan tema gelap untuk layar',
      type: 'toggle',
      value: darkMode,
      icon: 'weather-night',
      onToggle: (value) => {
        setDarkMode(value);
        // TODO: Implement dark mode theme switching
        if (value) {
          Alert.alert('Info', 'Mode gelap akan tersedia di versi mendatang');
          setDarkMode(false);
        }
      },
    },
  ];

  const privacySettings: SettingItem[] = [
    {
      key: 'locationBg',
      label: 'Lokasi Latar Belakang',
      description: 'Izinkan pelacakan lokasi saat aplikasi ditutup',
      type: 'toggle',
      value: locationBackground,
      icon: 'map-marker',
      onToggle: setLocationBackground,
    },
    {
      key: 'analytics',
      label: 'Analitik',
      description: 'Bantu tingkatkan aplikasi dengan data anonim',
      type: 'toggle',
      value: analytics,
      icon: 'chart-bar',
      onToggle: setAnalytics,
    },
  ];

  const accountSettings: SettingItem[] = [
    {
      key: 'logout',
      label: 'Keluar',
      description: 'Keluar dari akun Anda',
      type: 'button',
      icon: 'logout',
      onPress: handleLogout,
      danger: true,
    },
  ];

  /**
   * Render a setting item row
   */
  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.key}
      style={styles.settingItem}
      onPress={item.type === 'button' ? item.onPress : undefined}
      activeOpacity={item.type === 'toggle' ? 1 : 0.7}
      accessibilityRole={item.type === 'toggle' ? 'switch' : 'button'}
      accessibilityLabel={item.label}
      accessibilityHint={item.description}
      accessibilityState={item.type === 'toggle' ? { checked: item.value } : undefined}
    >
      <View style={styles.settingItemLeft}>
        <View style={[styles.iconContainer, item.danger && styles.iconContainerDanger]}>
          <MaterialCommunityIcons
            name={item.icon}
            size={22}
            color={item.danger ? nbColors.danger : nbColors.black}
          />
        </View>
        <View style={styles.settingItemText}>
          <Text style={[styles.settingLabel, item.danger && styles.settingLabelDanger]}>
            {item.label}
          </Text>
          {item.description && (
            <Text style={styles.settingDescription}>{item.description}</Text>
          )}
        </View>
      </View>
      {item.type === 'toggle' && (
        <Switch
          value={item.value}
          onValueChange={item.onToggle}
          trackColor={{
            false: nbColors.gray['300'],
            true: nbColors.primaryLight,
          }}
          thumbColor={item.value ? nbColors.primary : nbColors.gray['100']}
          ios_backgroundColor={nbColors.gray['300']}
        />
      )}
      {item.type === 'button' && (
        <MaterialCommunityIcons
          name="chevron-right"
          size={24}
          color={item.danger ? nbColors.danger : nbColors.gray['500']}
        />
      )}
    </TouchableOpacity>
  );

  /**
   * Render a settings section
   */
  const renderSection = (title: string, items: SettingItem[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <NBCard style={styles.sectionCard}>
        {items.map((item, index) => (
          <React.Fragment key={item.key}>
            {renderSettingItem(item)}
            {index < items.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </NBCard>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <NBBackgroundPattern variant="grid" opacity={0.03} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Title */}
        <Text style={styles.pageTitle}>Pengaturan</Text>

        {/* Notification Settings */}
        {renderSection('Notifikasi', notificationSettings)}

        {/* Display Settings */}
        {renderSection('Tampilan', displaySettings)}

        {/* Privacy Settings */}
        {renderSection('Privasi', privacySettings)}

        {/* Account Settings */}
        {renderSection('Akun', accountSettings)}

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>
            Versi {appVersion} | Build {buildNumber}
          </Text>
          <Text style={styles.appInfoCopyright}>
            SEKAR - Sistem Evaluasi Kerja Satgas RTH
          </Text>
          <Text style={styles.appInfoCopyright}>
            DLH Surabaya 2026
          </Text>
        </View>
      </ScrollView>

      {/* Logout Confirmation Alert */}
      {showLogoutAlert && (
        <View style={styles.alertOverlay}>
          <View style={styles.alertContainer}>
            <NBAlert
              variant="warning"
              title="Konfirmasi Keluar"
              message="Apakah Anda yakin ingin keluar dari aplikasi?"
              dismissible
              onDismiss={() => setShowLogoutAlert(false)}
              actionLabel="Keluar"
              onAction={confirmLogout}
              testID="logout-alert"
            />
          </View>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: nbColors.background,
  },
  content: {
    padding: nbSpacing.md,
    paddingBottom: nbSpacing['2xl'],
  },
  pageTitle: {
    fontSize: nbTypography.fontSize['2xl'],
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    marginBottom: nbSpacing.lg,
  },
  section: {
    marginBottom: nbSpacing.lg,
  },
  sectionTitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.gray['600'],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: nbSpacing.sm,
    marginLeft: nbSpacing.xs,
  },
  sectionCard: {
    padding: 0,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: nbTouchTarget.minHeight,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: nbSpacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: nbBorderRadius.base,
    backgroundColor: nbColors.gray['100'],
    borderWidth: nbBorders.thin,
    borderColor: nbColors.black,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: nbSpacing.sm,
  },
  iconContainerDanger: {
    backgroundColor: nbColors.dangerLight,
  },
  settingItemText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.black,
  },
  settingLabelDanger: {
    color: nbColors.danger,
  },
  settingDescription: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['600'],
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: nbColors.gray['200'],
    marginLeft: nbSpacing.md + 40 + nbSpacing.sm, // Align with text after icon
  },
  appInfo: {
    alignItems: 'center',
    marginTop: nbSpacing.xl,
    paddingTop: nbSpacing.lg,
  },
  appInfoText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['500'],
    marginBottom: nbSpacing.xs,
  },
  appInfoCopyright: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray['400'],
    textAlign: 'center',
  },
  alertOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: nbColors.overlay,
  },
  alertContainer: {
    width: '90%',
    maxWidth: 400,
  },
});

export default SettingsScreen;
