/**
 * TrailInfoBar
 *
 * Bottom NB stats card: distance walked, time inside the assigned area, and
 * time outside it. Worker name lives in the header, so we don't repeat it.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbShadows,
} from '../../constants/nbTokens';
import type { LocationHistory } from '../../types/models.types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TrailInfoBarProps {
  history: LocationHistory;
  date: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDistance(meters: number): string {
  if (meters >= 1000) { return `${(meters / 1000).toFixed(1)} km`; }
  return `${Math.round(meters)} m`;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) { return `${m}m`; }
  return `${h}j ${m}m`;
}

// Match LocationTrail polylines/markers — single source of truth for the
// inside/outside palette is the trailColors module.
import { TRAIL_INSIDE_COLOR, TRAIL_OUTSIDE_COLOR } from './trailColors';

// ─── Component ────────────────────────────────────────────────────────────────

export function TrailInfoBar({ history }: TrailInfoBarProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Stat
        icon="map-marker-distance"
        label="Total Jarak"
        value={formatDistance(history.total_distance_meters)}
        accent={nbColors.black}
      />
      <View style={styles.divider} />
      <Stat
        icon="map-marker-check"
        label="Di Area"
        value={formatMinutes(history.time_inside_area_minutes)}
        accent={TRAIL_INSIDE_COLOR}
      />
      <View style={styles.divider} />
      <Stat
        icon="map-marker-off"
        label="Di Luar"
        value={formatMinutes(history.time_outside_area_minutes)}
        accent={TRAIL_OUTSIDE_COLOR}
      />
    </View>
  );
}

// ─── Stat ─────────────────────────────────────────────────────────────────────

interface StatProps {
  icon: string;
  label: string;
  value: string;
  accent: string;
}

function Stat({ icon, label, value, accent }: StatProps): React.JSX.Element {
  return (
    <View style={styles.stat}>
      <View style={styles.statHeader}>
        <MaterialCommunityIcons name={icon} size={14} color={accent} />
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color: accent }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: nbColors.white,
    paddingHorizontal: nbSpacing.md,
    paddingTop: nbSpacing.sm,
    paddingBottom: nbSpacing.md,
    borderTopWidth: nbBorders.base,
    borderTopColor: nbColors.black,
    ...nbShadows.sm,
  },
  stat: {
    flex: 1,
    paddingHorizontal: nbSpacing.xs,
    gap: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray['600'],
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
  },
  divider: {
    width: nbBorders.thin,
    backgroundColor: nbColors.black,
    marginVertical: 2,
  },
});
