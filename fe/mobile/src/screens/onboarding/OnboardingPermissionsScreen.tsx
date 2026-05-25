/**
 * OnboardingPermissionsScreen — Phase 4 M3 / ADR-042 / Hifi OB-2
 *
 * Permission primer — this REPLACES the old startup PermissionRequestModal.
 * Each row has an "Izinkan" button that triggers the native prompt; the status
 * pill updates after. There is no skip — "Lanjut" stays disabled until every
 * permission has been addressed (granted or denied).
 *
 * Set reconciled with the legacy modal: notifications · location · background
 * location · camera · gallery (location is requested before background location).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NBButton, NBText, type NBTextColor } from '../../components/nb';
import { PaginationDots } from '../../components/auth/PaginationDots';
import { nbColors, nbBorders, nbRadius, nbShadows, nbSpacing } from '../../constants/nbTokens';
import { permissionManager } from '../../services/permissions';

type PermStatus = 'pending' | 'granted' | 'denied';

interface PermRow {
  key: string;
  title: string;
  why: string;
  icon: string;
  tint: string;
  required: boolean;
  request: () => Promise<{ granted: boolean }>;
}

const ROWS: PermRow[] = [
  {
    key: 'notifications',
    title: 'Notifikasi',
    why: 'Pengingat shift & penugasan.',
    icon: '🔔',
    tint: nbColors.bgAccentPink,
    required: true,
    request: () => permissionManager.requestNotificationPermission(),
  },
  {
    key: 'location',
    title: 'Lokasi',
    why: 'Presensi & geofence pos.',
    icon: '📍',
    tint: nbColors.bgAccentMint,
    required: true,
    request: () => permissionManager.requestLocationPermission(),
  },
  {
    key: 'camera',
    title: 'Kamera',
    why: 'Foto laporan & swafoto clock-in.',
    icon: '📷',
    tint: nbColors.bgAccentYellow,
    required: true,
    request: () => permissionManager.requestCameraPermission(),
  },
  {
    key: 'gallery',
    title: 'Galeri',
    why: 'Lampirkan foto dari galeri.',
    icon: '🖼️',
    tint: nbColors.bgAccentLilac,
    required: true,
    request: () => permissionManager.requestGalleryPermission(),
  },
  {
    // Optional: Android 11+ grants "all the time" only from Settings, which is a
    // poor onboarding experience — so this doesn't block "Lanjut". The app can
    // re-prompt at clock-in where background tracking is actually used.
    key: 'background_location',
    title: 'Lokasi latar belakang',
    why: 'Pelacakan rute selama shift berjalan.',
    icon: '🛰️',
    tint: nbColors.bgAccentGreen,
    required: false,
    request: () => permissionManager.requestBackgroundLocationPermission(),
  },
];

const PILL: Record<'granted' | 'denied', { label: string; bg: string; fg: NBTextColor }> = {
  granted: { label: 'DIBERIKAN', bg: nbColors.statusActiveBg, fg: 'statusActive' },
  denied: { label: 'DITOLAK', bg: nbColors.statusMissingBg, fg: 'statusMissing' },
};

function PermissionRowView({
  row,
  status,
  onGrant,
}: {
  row: PermRow;
  status: PermStatus;
  onGrant: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.row} testID={`perm-row-${row.key}`}>
      <View style={[styles.pico, { backgroundColor: row.tint }]}>
        <Text style={styles.picoIcon}>{row.icon}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.titleRow}>
          <NBText variant="body-sm" color="black" style={styles.rowTitle}>
            {row.title}
          </NBText>
          {!row.required ? (
            <NBText variant="mono-sm" color="gray500">
              · Opsional
            </NBText>
          ) : null}
        </View>
        <NBText variant="caption" color="gray600">
          {row.why}
        </NBText>
      </View>
      {status === 'pending' ? (
        <NBButton
          title="Izinkan"
          variant="primary"
          size="sm"
          onPress={onGrant}
          testID={`perm-grant-${row.key}`}
        />
      ) : (
        <View style={[styles.pill, { backgroundColor: PILL[status].bg }]}>
          <NBText variant="mono-sm" color={PILL[status].fg} testID={`perm-status-${row.key}`}>
            {PILL[status].label}
          </NBText>
        </View>
      )}
    </View>
  );
}

export function OnboardingPermissionsScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [statuses, setStatuses] = useState<Record<string, PermStatus>>(() => {
    const init: Record<string, PermStatus> = {};
    ROWS.forEach((r) => (init[r.key] = 'pending'));
    return init;
  });

  // Re-read actual status on foreground return — catches permissions the user
  // grants from system Settings (notably background location on Android 11+,
  // which has no inline prompt). Only upgrades to 'granted', never downgrades.
  const refresh = useCallback(async () => {
    const all = await permissionManager.checkAllPermissions();
    setStatuses((s) => ({
      ...s,
      notifications: all.notifications.granted ? 'granted' : s.notifications,
      location: all.location.granted ? 'granted' : s.location,
      background_location: all.backgroundLocation.granted ? 'granted' : s.background_location,
      camera: all.camera.granted ? 'granted' : s.camera,
      gallery: all.gallery.granted ? 'granted' : s.gallery,
    }));
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const grant = async (row: PermRow) => {
    // Background location: needs foreground location first, and on Android 11+
    // can only be granted via Settings ("Izinkan sepanjang waktu").
    if (row.key === 'background_location') {
      // Foreground location must be granted first, then attempt background inline.
      // No Settings dump (poor UX) — background is optional; the AppState re-check
      // upgrades the pill if the user later allows it from system Settings.
      const fg = await permissionManager.requestLocationPermission();
      setStatuses((s) => ({ ...s, location: fg.granted ? 'granted' : 'denied' }));
      const bg = fg.granted
        ? await permissionManager.requestBackgroundLocationPermission()
        : { granted: false };
      setStatuses((s) => ({ ...s, background_location: bg.granted ? 'granted' : 'denied' }));
      return;
    }

    try {
      const res = await row.request();
      setStatuses((s) => ({ ...s, [row.key]: res.granted ? 'granted' : 'denied' }));
    } catch {
      setStatuses((s) => ({ ...s, [row.key]: 'denied' }));
    }
  };

  // "Lanjut" is gated on the required permissions only; background location is
  // optional (can't be one-tapped on Android 11+).
  const requiredAddressed = ROWS.filter((r) => r.required).every(
    (r) => statuses[r.key] !== 'pending',
  );

  return (
    <SafeAreaView style={styles.root} testID="onboarding-permissions-screen">
      <ScrollView contentContainerStyle={styles.content}>
        <PaginationDots variant="bars" total={3} index={1} style={styles.dots} />
        <NBText variant="h2">Beri akses ke HP-mu</NBText>
        <NBText variant="body-sm" color="gray600" style={styles.subtitle}>
          Aplikasi memerlukan izin berikut agar berfungsi penuh. Bisa diubah di Pengaturan kapan saja.
        </NBText>

        <View style={styles.list}>
          {ROWS.map((row) => (
            <PermissionRowView
              key={row.key}
              row={row}
              status={statuses[row.key]}
              onGrant={() => grant(row)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <NBButton
          title="Lanjut"
          variant="primary"
          fullWidth
          disabled={!requiredAddressed}
          onPress={() => navigation.navigate('OnboardingAreaPreview' as never)}
          testID="onboarding-permissions-continue"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: nbColors.bgCanvas },
  content: { padding: nbSpacing.lg },
  dots: { marginBottom: nbSpacing.xl },
  subtitle: { marginTop: nbSpacing.xs, marginBottom: nbSpacing.lg },
  list: { gap: nbSpacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.md,
    backgroundColor: nbColors.bgSurface,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    padding: nbSpacing.md,
    ...nbShadows.xs,
  },
  pico: {
    width: 40,
    height: 40,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  picoIcon: { fontSize: 20 },
  rowBody: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: nbSpacing.xs, flexWrap: 'wrap' },
  rowTitle: { fontWeight: '700' },
  pill: {
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.black,
    borderRadius: nbRadius.full,
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
  },
  footer: {
    padding: nbSpacing.lg,
    borderTopWidth: nbBorders.widthBase,
    borderTopColor: nbColors.black,
    backgroundColor: nbColors.bgSurface,
  },
});

export default OnboardingPermissionsScreen;
