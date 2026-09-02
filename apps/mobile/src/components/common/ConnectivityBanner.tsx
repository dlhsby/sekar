/**
 * ConnectivityBanner — three-state slide-down banner (Phase 4-2 M2)
 *
 * Surface for the ConnectivityMonitor signals. Renders nothing on ONLINE.
 * Yellow on NO_INTERNET, orange on SERVER_UNREACHABLE.
 *
 * Mounted above the navigator in App.tsx so the banner persists across
 * screen transitions.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { nbColors, nbBorders, nbShadows } from '../../constants/nbTokens';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../nb/NBText';
import {
  ConnectivityMonitor,
  type ConnectivityStatusSnapshot,
} from '../../services/sync/connectivityStatus';

export interface ConnectivityBannerProps {
  monitor: ConnectivityMonitor;
}

const COLORS = {
  NO_INTERNET: {
    bg: nbColors.warningLight,
    fg: nbColors.black,
  },
  SERVER_UNREACHABLE: {
    bg: nbColors.dangerLight,
    fg: nbColors.black,
  },
} as const;

export function ConnectivityBanner({ monitor }: ConnectivityBannerProps): React.JSX.Element | null {
  const { t } = useTranslation('common');
  const [snap, setSnap] = useState<ConnectivityStatusSnapshot>(() => monitor.snapshot());
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const unsub = monitor.subscribe(setSnap);
    return unsub;
  }, [monitor]);

  // The banner already auto-retries on a poll, but the user cannot ask for a
  // check NOW. On 2026-09-02 staging recovered well before the next poll and
  // the app still read as disconnected with nothing to tap.
  //
  // The in-flight guard is deliberate: without it a frustrated user queues a
  // burst of health checks at a server that is already struggling.
  const onRetry = useCallback(() => {
    if (checking) return;
    setChecking(true);
    void Promise.resolve(monitor.refresh())
      .catch(() => undefined) // a failed check is the normal case here
      .finally(() => setChecking(false));
  }, [checking, monitor]);

  if (snap.status === 'ONLINE') return null;

  const palette = COLORS[snap.status];
  const message = snap.status === 'NO_INTERNET'
    ? t('connectivity.noInternet')
    : t('connectivity.serverUnreachable');

  return (
    <View
      style={[styles.container, { backgroundColor: palette.bg }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      testID={`connectivity-banner-${snap.status.toLowerCase()}`}
    >
      <NBText
        variant="caption"
        color="black"
        uppercase
        style={styles.label}
        numberOfLines={1}
      >
        {message}
      </NBText>

      <Pressable
        onPress={onRetry}
        disabled={checking}
        accessibilityRole="button"
        accessibilityLabel={t('connectivity.retry')}
        accessibilityState={{ disabled: checking, busy: checking }}
        // 44pt hit target without widening the banner itself.
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        testID="connectivity-retry"
        style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
      >
        {checking ? (
          <ActivityIndicator size="small" color={palette.fg} testID="connectivity-retry-spinner" />
        ) : (
          <Icon name="refresh" size={20} color={palette.fg} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: nbBorders.widthThick,
    borderBottomColor: nbColors.black,
    ...nbShadows.sm,
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.04,
  },
  retry: {
    minWidth: 24,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryPressed: {
    opacity: 0.6,
  },
});

export default ConnectivityBanner;
