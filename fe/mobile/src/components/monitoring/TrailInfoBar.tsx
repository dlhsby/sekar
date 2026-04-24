/**
 * TrailInfoBar Component
 * Phase 2D Gap #6: Displays trail summary info (name, date, distance, time stats).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbSpacing,
  nbTypography,
} from '../../constants/nbTokens';
import type { LocationHistory } from '../../types/models.types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TrailInfoBarProps {
  history: LocationHistory;
  date: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.round(meters)}m`;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}j ${m}m`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TrailInfoBar({ history, date }: TrailInfoBarProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <InfoItem
          icon="account"
          value={history.user_name}
        />
        <InfoItem
          icon="map-marker-distance"
          value={formatDistance(history.total_distance_meters)}
        />
      </View>
      <View style={styles.row}>
        <InfoItem
          icon="map-marker-check"
          value={`Di area: ${formatMinutes(history.time_inside_area_minutes)}`}
          color={nbColors.successDark}
        />
        <InfoItem
          icon="map-marker-off"
          value={`Di luar: ${formatMinutes(history.time_outside_area_minutes)}`}
          color={nbColors.dangerDark}
        />
      </View>
    </View>
  );
}

// ─── InfoItem ─────────────────────────────────────────────────────────────────

function InfoItem({
  icon,
  value,
  color,
}: {
  icon: string;
  value: string;
  color?: string;
}): React.JSX.Element {
  return (
    <View style={styles.infoItem}>
      <MaterialCommunityIcons
        name={icon}
        size={12}
        color={color ?? nbColors.white}
      />
      <Text style={[styles.infoText, color ? { color } : undefined]} numberOfLines={1}>
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
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.xs,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: nbSpacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  infoText: {
    color: nbColors.white,
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.medium,
  },
});
