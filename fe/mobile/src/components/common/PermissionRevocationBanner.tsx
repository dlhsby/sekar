/**
 * PermissionRevocationBanner — Phase 4 M3a+b runtime fallback.
 *
 * Sits above the navigator (next to ConnectivityBanner). Renders nothing
 * while all required permissions are granted. When one or more are missing
 * — typically because the user revoked them from Settings while the app
 * was backgrounded — it shows a single-line yellow banner that opens the
 * system Settings on tap so the user can re-enable.
 *
 * Why not re-prompt the OS dialog: after a denial, Android/iOS suppress
 * the prompt. The only path back to "granted" is Settings.
 *
 * Wired in App.tsx with `enabled = isAuthenticated && !isRestoring`. The
 * underlying hook also re-checks on every foreground transition, so the
 * banner self-dismisses as soon as the user toggles the permission back on
 * and returns to the app.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { nbBorders, nbColors, nbShadows } from '../../constants/nbTokens';
import {
  PERMISSION_LABEL,
  permissionManager,
  usePermissionMonitor,
} from '../../services/permissions';

export interface PermissionRevocationBannerProps {
  enabled: boolean;
}

export function PermissionRevocationBanner({
  enabled,
}: PermissionRevocationBannerProps): React.JSX.Element | null {
  const { missing, initializing } = usePermissionMonitor(enabled);

  if (!enabled || initializing || missing.length === 0) {
    return null;
  }

  const labelList = missing.map((p) => PERMISSION_LABEL[p]).join(', ');

  return (
    <Pressable
      onPress={() => {
        void permissionManager.openSettings();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Izin ${labelList} dinonaktifkan. Ketuk untuk membuka Pengaturan.`}
      testID="permission-revocation-banner"
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: nbColors.warningLight ?? '#FFE08A' },
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.row}>
        <Text style={[styles.label, { color: nbColors.black ?? '#1C1917' }]} numberOfLines={2}>
          Izin {labelList} dinonaktifkan
        </Text>
        <Text style={[styles.cta, { color: nbColors.black ?? '#1C1917' }]}>BUKA PENGATURAN</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: nbBorders?.thick ?? 2,
    borderBottomColor: nbColors.black ?? '#1C1917',
    ...(nbShadows?.sm ?? {}),
  },
  pressed: { opacity: 0.85 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    flex: 1,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.04,
    textTransform: 'uppercase' as const,
  },
  cta: {
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.06,
    textTransform: 'uppercase' as const,
  },
});

export default PermissionRevocationBanner;
