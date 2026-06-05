/**
 * UserMarker Component
 * Phase 2D: Role-specific icons, four-status colors, zoom-based labels.
 * Supports dimmed mode for trail hide-others feature.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbShadows,
  nbBorders,
} from '../../constants/nbTokens';
import { NBText } from '../nb/NBText';
import { getActivityColor, getRoleIcon } from '../../utils/mapUtils';
import { userAxes } from '../../utils/statusHelpers';
import { ROLE_LABELS } from '../../constants/roles';
import type { LiveUser, UserRole } from '../../types/models.types';

/** @deprecated Use TrackingStatus — kept for backward compatibility */
export type UserStatus = 'active' | 'warning' | 'outside';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_ABBREVIATIONS: Record<string, string> = {
  satgas: 'STG',
  linmas: 'LMS',
  korlap: 'KLP',
};

// ─── Public Types ─────────────────────────────────────────────────────────────

/**
 * Three discrete label states derived from map zoom thresholds:
 * - 'none':   latitudeDelta >= 0.015 — city-wide, no label
 * - 'abbrev': 0.005 < latitudeDelta < 0.015 — neighbourhood, abbreviated
 * - 'full':   latitudeDelta <= 0.005 — street-level, full name
 *
 * Passing this enum instead of the raw latitudeDelta float prevents UserMarker
 * from re-rendering on every map pan; it only re-renders when the label type
 * actually changes (at most 3 distinct values). Combined with tracksViewChanges={false}
 * and a key that includes labelMode, the Android bitmap is stable and never cropped.
 */
export type LabelMode = 'none' | 'abbrev' | 'full';

// ─── Props ────────────────────────────────────────────────────────────────────

interface UserMarkerProps {
  user: LiveUser;
  onPress: (user: LiveUser) => void;
  labelMode: LabelMode;
  clusterCount?: number;
  dimmed?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRoleLabel(role: string): string {
  if (role in ROLE_LABELS) {
    return ROLE_LABELS[role as UserRole];
  }
  return role;
}

function getFirstName(fullName: string): string {
  return fullName.split(' ')[0] ?? fullName;
}

function getMarkerLabel(user: LiveUser, mode: LabelMode): string | null {
  if (mode === 'none') { return null; }
  if (mode === 'abbrev') {
    const abbrev = ROLE_ABBREVIATIONS[user.role] ?? user.role.toUpperCase().slice(0, 3);
    return `${abbrev} - ${getFirstName(user.full_name)}`;
  }
  return `${getRoleLabel(user.role)} - ${user.full_name}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const UserMarker = React.memo(function UserMarker({
  user,
  onPress,
  labelMode,
  clusterCount,
  dimmed = false,
}: UserMarkerProps): React.JSX.Element {
  const isCluster = (clusterCount ?? 0) > 1;
  // Two-axis (CP6): fill = activity color; a ring marks luar_area.
  const { activity, location } = userAxes(user);
  const markerColor = getActivityColor(activity);
  const isOutside = location === 'luar_area';
  const roleIcon = getRoleIcon(user.role);
  const label = isCluster ? null : getMarkerLabel(user, labelMode);
  const isCloseZoom = labelMode === 'full';

  // Phase 3 marker-rendering fix:
  // Android needs `tracksViewChanges={true}` for one frame after mount so the
  // native bitmap is captured at the *measured* size of the label container.
  // Without this, the cached bitmap is captured before layout settles which
  // crops the right edge of long labels and makes the marker disappear when
  // a key change (zoom threshold cross / status flip) forces remount.
  // We flip back to `false` after 250 ms to restore the perf benefit on pan.
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  useEffect(() => {
    setTracksViewChanges(true);
    const t = setTimeout(() => setTracksViewChanges(false), 250);
    return () => clearTimeout(t);
  }, [labelMode, user.status, user.activity, user.location, user.is_within_area, user.full_name, isCluster, clusterCount]);

  return (
    <Marker
      coordinate={{ latitude: user.latitude, longitude: user.longitude }}
      onPress={(e) => {
        // Prevent Google Maps default behavior of panning the camera to the
        // tapped marker on Android — that auto-pan was masking the bottom-sheet
        // open as if "tap only focuses the map." stopPropagation also keeps
        // the press from bubbling to MapView.onPress / nested polygons.
        // Guarded with optional chaining on `e` so unit-test invocations
        // (which call onPress() with no args) don't crash here.
        e?.stopPropagation?.();
        onPress(user);
      }}
      tracksViewChanges={tracksViewChanges}
      anchor={{ x: 0.5, y: 1 }}
      zIndex={isCluster ? 100 : 200}
      style={dimmed ? styles.dimmed : undefined}
    >
      <View style={styles.markerContainer}>
        {isCluster ? (
          <View style={[styles.clusterMarker, { backgroundColor: nbColors.primary }]}>
            <NBText variant="body" color="white" style={styles.clusterText}>
              {clusterCount}
            </NBText>
          </View>
        ) : (
          <>
            {/* Ring marks luar_area; transparent (but same size) otherwise so the
                cached bitmap dimensions stay stable on Android. */}
            <View style={[styles.markerRing, isOutside && styles.markerRingOutside]}>
              <View style={[styles.marker, { backgroundColor: markerColor }]}>
                <MaterialCommunityIcons
                  name={roleIcon}
                  size={16}
                  color={nbColors.white}
                />
              </View>
            </View>
            <View style={[styles.markerArrow, { borderTopColor: markerColor }]} />
            {/* Always render label placeholder to keep view hierarchy stable on Android
                (prevents bitmap recreation flicker when label appears/disappears) */}
            <NBText
              variant="caption"
              color="white"
              style={[
                styles.nameLabel,
                isCloseZoom ? styles.nameLabelFull : styles.nameLabelAbbrev,
                !label && styles.labelHidden,
              ]}
              numberOfLines={1}
            >
              {label ?? ''}
            </NBText>
          </>
        )}
      </View>
    </Marker>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    // Reserve enough horizontal space for the widest label (full name mode caps
    // at 120 px). With `tracksViewChanges={false}` Android caches the bitmap at
    // the measured width, so an undersized container clips the right edge. A
    // fixed width keeps the bitmap dimensions stable across re-renders.
    width: 132,
    paddingHorizontal: 6,
  },
  dimmed: {
    opacity: 0.2,
  },
  // Outer ring (luar_area indicator). Always rendered at the same size with a
  // 2px padding + 2px border so the Android bitmap is stable; the border is
  // transparent for dalam_area and location-tinted for luar_area.
  markerRing: {
    borderRadius: 20,
    padding: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  markerRingOutside: {
    borderColor: nbColors.statusOutside,
    backgroundColor: nbColors.white,
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: nbBorders.base,
    borderColor: nbColors.white,
    ...nbShadows.md,
  },
  markerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  nameLabel: {
    fontSize: 10,
    color: nbColors.white,
    textShadowColor: nbColors.black,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    textAlign: 'center',
    marginTop: 2,
  },
  nameLabelAbbrev: {
    maxWidth: 80,
  },
  nameLabelFull: {
    maxWidth: 120,
  },
  labelHidden: {
    opacity: 0,
    height: 0,
    marginTop: 0,
  },
  clusterMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: nbBorders.thick,
    borderColor: nbColors.white,
    ...nbShadows.lg,
  },
  clusterText: {
    color: nbColors.white,
  },
});
