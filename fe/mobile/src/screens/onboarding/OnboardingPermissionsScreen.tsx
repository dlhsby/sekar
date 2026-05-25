/**
 * OnboardingPermissionsScreen — Phase 4 M3 / ADR-042 / Hifi OB-2
 *
 * Permission primer. Tapping a row triggers the native prompt; the status pill
 * updates after. Everything is skippable (no hard blockers) — "Lanjut" always
 * advances to the area preview.
 *
 * Reconciliation: the app's PermissionManager exposes three permissions
 * (location · camera · notifications); the hi-fi's extra "optional" group
 * (gallery/phone/SMS) isn't backed by the app, so it isn't shown.
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  request: () => Promise<{ granted: boolean }>;
}

const ROWS: PermRow[] = [
  {
    key: 'location',
    title: 'Lokasi',
    why: 'Untuk presensi & geofence pos.',
    icon: '📍',
    tint: nbColors.bgAccentMint,
    request: () => permissionManager.requestLocationPermission(),
  },
  {
    key: 'camera',
    title: 'Kamera',
    why: 'Foto laporan aktivitas.',
    icon: '📷',
    tint: nbColors.bgAccentYellow,
    request: () => permissionManager.requestCameraPermission(),
  },
  {
    key: 'notifications',
    title: 'Notifikasi',
    why: 'Pengingat shift & penugasan.',
    icon: '🔔',
    tint: nbColors.bgAccentPink,
    request: () => permissionManager.requestNotificationPermission(),
  },
];

const PILL: Record<PermStatus, { label: string; bg: string; fg: NBTextColor }> = {
  pending: { label: 'TAP UNTUK IZIN', bg: nbColors.statusIdleBg, fg: 'statusIdle' },
  granted: { label: 'DIBERIKAN', bg: nbColors.statusActiveBg, fg: 'statusActive' },
  denied: { label: 'DITOLAK', bg: nbColors.statusMissingBg, fg: 'statusMissing' },
};

function PermissionRowView({
  row,
  status,
  onPress,
}: {
  row: PermRow;
  status: PermStatus;
  onPress: () => void;
}): React.JSX.Element {
  const pill = PILL[status];
  return (
    <Pressable
      style={styles.row}
      onPress={status === 'pending' ? onPress : undefined}
      accessibilityRole="button"
      testID={`perm-row-${row.key}`}
    >
      <View style={[styles.pico, { backgroundColor: row.tint }]}>
        <Text style={styles.picoIcon}>{row.icon}</Text>
      </View>
      <View style={styles.rowBody}>
        <NBText variant="body-sm" color="black" style={styles.rowTitle}>
          {row.title}
        </NBText>
        <NBText variant="caption" color="gray600">
          {row.why}
        </NBText>
      </View>
      <View style={[styles.pill, { backgroundColor: pill.bg }]}>
        <NBText variant="mono-sm" color={pill.fg} testID={`perm-status-${row.key}`}>
          {pill.label}
        </NBText>
      </View>
    </Pressable>
  );
}

export function OnboardingPermissionsScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [statuses, setStatuses] = useState<Record<string, PermStatus>>(() => {
    const init: Partial<Record<string, PermStatus>> = {};
    ROWS.forEach((r) => (init[r.key] = 'pending'));
    return init as Record<string, PermStatus>;
  });

  const grant = async (row: PermRow) => {
    try {
      const res = await row.request();
      setStatuses((s) => ({ ...s, [row.key]: res.granted ? 'granted' : 'denied' }));
    } catch {
      setStatuses((s) => ({ ...s, [row.key]: 'denied' }));
    }
  };

  return (
    <SafeAreaView style={styles.root} testID="onboarding-permissions-screen">
      <ScrollView contentContainerStyle={styles.content}>
        <PaginationDots variant="bars" total={3} index={1} style={styles.dots} />
        <NBText variant="h2">Beri akses ke HP-mu</NBText>
        <NBText variant="body-sm" color="gray600" style={styles.subtitle}>
          Kami pakai hanya untuk tugas. Bisa diubah di Pengaturan kapan saja.
        </NBText>

        <View style={styles.list}>
          {ROWS.map((row) => (
            <PermissionRowView
              key={row.key}
              row={row}
              status={statuses[row.key]}
              onPress={() => grant(row)}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <NBButton
          title="Lanjut"
          variant="primary"
          fullWidth
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
