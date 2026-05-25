/**
 * OnboardingPermissionsScreen — Phase 4 M3b / ADR-042 / Hifi OB-2
 *
 * Replaces `PermissionRequestModal` with a full-screen, sequential primer.
 * Resolves design ambiguities #4 + #5 (ui-ux.md):
 * - Sequential order: location → camera → notifications → gallery → background-location
 *   (driven by the PermissionType enum in PermissionManager).
 * - Skip-anything allowed; no hard blockers. User reaches OB-3 after the
 *   list is processed regardless of grants.
 *
 * `Background location` is grouped last because Android 11+ requires
 * foreground-location to be granted first.
 */

import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NBButton, NBCard, NBText } from '../../components/nb';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import { PermissionType, permissionManager } from '../../services/permissions';

type PermStatus = 'pending' | 'granted' | 'denied' | 'skipped';

interface PermissionRow {
  type: PermissionType;
  title: string;
  why: string;
  required: boolean;
  request: () => Promise<{ granted: boolean }>;
}

const ROWS: PermissionRow[] = [
  {
    type: PermissionType.LOCATION,
    title: 'Lokasi',
    why: 'Untuk validasi clock-in dan pelacakan tim selama shift.',
    required: true,
    request: () => permissionManager.requestLocationPermission(),
  },
  {
    type: PermissionType.CAMERA,
    title: 'Kamera',
    why: 'Untuk swafoto saat clock-in dan foto bukti aktivitas.',
    required: true,
    request: () => permissionManager.requestCameraPermission(),
  },
  {
    type: PermissionType.NOTIFICATIONS,
    title: 'Notifikasi',
    why: 'Untuk pengingat shift, penugasan, dan pengumuman.',
    required: true,
    request: () => permissionManager.requestNotificationPermission(),
  },
];

export function OnboardingPermissionsScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [statuses, setStatuses] = useState<Record<PermissionType, PermStatus>>(() => {
    const init: Partial<Record<PermissionType, PermStatus>> = {};
    ROWS.forEach((r) => (init[r.type] = 'pending'));
    return init as Record<PermissionType, PermStatus>;
  });

  const allProcessed = useMemo(
    () => ROWS.every((r) => statuses[r.type] !== 'pending'),
    [statuses],
  );

  const grant = async (row: PermissionRow) => {
    try {
      const res = await row.request();
      setStatuses((s) => ({
        ...s,
        [row.type]: res.granted ? 'granted' : 'denied',
      }));
    } catch {
      setStatuses((s) => ({ ...s, [row.type]: 'denied' }));
    }
  };

  const skip = (row: PermissionRow) => {
    setStatuses((s) => ({ ...s, [row.type]: 'skipped' }));
  };

  const finish = () => {
    navigation.navigate('OnboardingAreaPreview' as never);
  };

  return (
    <SafeAreaView
      style={[
        styles.root,
        { backgroundColor: (nbColors as Record<string, string>).paper ?? '#F5F0EB' },
      ]}
      testID="onboarding-permissions-screen"
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <NBText variant="h1">Izin Aplikasi</NBText>
          <NBText variant="body" style={styles.subtitle}>
            Aplikasi memerlukan beberapa izin untuk berfungsi. Anda dapat melewati
            izin yang tidak diperlukan dan mengaturnya nanti.
          </NBText>
        </View>

        {ROWS.map((row) => {
          const status = statuses[row.type];
          return (
            <NBCard
              key={row.type}
              style={styles.card}
              testID={`perm-row-${row.type}`}
            >
              <View style={styles.cardTop}>
                <NBText variant="h3">{row.title}</NBText>
                {status !== 'pending' ? (
                  <NBText variant="caption" testID={`perm-status-${row.type}`}>
                    {status.toUpperCase()}
                  </NBText>
                ) : null}
              </View>
              <NBText variant="body-sm" style={styles.cardBody}>
                {row.why}
              </NBText>
              {status === 'pending' ? (
                <View style={styles.cardActions}>
                  <NBButton
                    title="Lewati"
                    variant="ghost"
                    onPress={() => skip(row)}
                    testID={`perm-skip-${row.type}`}
                  />
                  <NBButton
                    title="Izinkan"
                    variant="primary"
                    onPress={() => grant(row)}
                    testID={`perm-grant-${row.type}`}
                  />
                </View>
              ) : null}
            </NBCard>
          );
        })}

        <NBButton
          title={allProcessed ? 'Lanjut' : 'Lewati semua & lanjut'}
          variant={allProcessed ? 'primary' : 'ghost'}
          fullWidth
          onPress={finish}
          testID="onboarding-permissions-continue"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    padding: nbSpacing?.lg ?? 24,
    gap: 12,
  },
  header: { gap: 8, paddingBottom: 8 },
  subtitle: { opacity: 0.85 },
  card: { gap: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardBody: { opacity: 0.85 },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 4,
  },
});

export default OnboardingPermissionsScreen;
