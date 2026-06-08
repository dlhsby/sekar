/**
 * ConnectivityBanner — three-state slide-down banner (Phase 4-2 M2)
 *
 * Surface for the ConnectivityMonitor signals. Renders nothing on ONLINE.
 * Yellow on NO_INTERNET, orange on SERVER_UNREACHABLE.
 *
 * Mounted above the navigator in App.tsx so the banner persists across
 * screen transitions.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { nbColors, nbBorders, nbShadows } from '../../constants/nbTokens';
import {
  ConnectivityMonitor,
  type ConnectivityStatusSnapshot,
} from '../../services/sync/connectivityStatus';

export interface ConnectivityBannerProps {
  monitor: ConnectivityMonitor;
}

const COPY = {
  NO_INTERNET: 'Tidak ada koneksi internet',
  SERVER_UNREACHABLE: 'Server tidak terjangkau, mencoba lagi…',
} as const;

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
  const [snap, setSnap] = useState<ConnectivityStatusSnapshot>(() => monitor.snapshot());

  useEffect(() => {
    const unsub = monitor.subscribe(setSnap);
    return unsub;
  }, [monitor]);

  if (snap.status === 'ONLINE') return null;

  const palette = COLORS[snap.status];

  return (
    <View
      style={[styles.container, { backgroundColor: palette.bg }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      testID={`connectivity-banner-${snap.status.toLowerCase()}`}
    >
      <Text style={[styles.label, { color: palette.fg }]} numberOfLines={1}>
        {COPY[snap.status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: nbBorders.widthThick,
    borderBottomColor: nbColors.black,
    ...nbShadows.sm,
  },
  label: {
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.04,
    textTransform: 'uppercase' as const,
  },
});

export default ConnectivityBanner;
