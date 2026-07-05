/**
 * TrailInfoBar
 *
 * Bottom NB stats card: distance walked, time inside the assigned area, and
 * time outside it. Worker name lives in the header, so we don't repeat it.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbShadows,
} from '../../constants/nbTokens';
import { NBText } from '../nb/NBText';
import type { LocationHistory } from '../../types/models.types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TrailInfoBarProps {
  history: LocationHistory;
  /** Bottom safe-area inset (px) added below the stats so they clear the home
   *  indicator while the bar's background still reaches the screen edge. */
  bottomInset?: number;
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

export function TrailInfoBar({ history, bottomInset = 0 }: TrailInfoBarProps): React.JSX.Element {
  const { t } = useTranslation('monitoring');

  return (
    <View style={[styles.container, { paddingBottom: nbSpacing.md + bottomInset }]}>
      <Stat
        icon="map-marker-distance"
        label={t('trailInfoBar.totalDistance')}
        value={formatDistance(history.total_distance_meters)}
        accent={nbColors.black}
      />
      <View style={styles.divider} />
      <Stat
        icon="map-marker-check"
        label={t('trailInfoBar.insideAreaTime')}
        value={formatMinutes(history.time_inside_area_minutes)}
        accent={TRAIL_INSIDE_COLOR}
      />
      <View style={styles.divider} />
      <Stat
        icon="map-marker-off"
        label={t('trailInfoBar.outsideAreaTime')}
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
        <NBText variant="caption" color="gray600" uppercase>
          {label}
        </NBText>
      </View>
      <NBText variant="body" style={{ color: accent }} numberOfLines={1}>
        {value}
      </NBText>
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
    borderTopWidth: nbBorders.widthBase,
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
  divider: {
    width: nbBorders.widthThin,
    backgroundColor: nbColors.black,
    marginVertical: 2,
  },
});
