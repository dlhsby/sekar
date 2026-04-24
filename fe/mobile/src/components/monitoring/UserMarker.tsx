/**
 * UserMarker Component
 * Phase 2D: Role-specific icons, four-status colors, zoom-based labels.
 * Supports dimmed mode for trail hide-others feature.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbTypography,
  nbShadows,
  nbBorders,
} from '../../constants/nbTokens';
import { getStatusColor, getRoleIcon } from '../../utils/mapUtils';
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
  const markerColor = getStatusColor(user.status);
  const roleIcon = getRoleIcon(user.role);
  const label = isCluster ? null : getMarkerLabel(user, labelMode);
  const isCloseZoom = labelMode === 'full';

  return (
    <Marker
      coordinate={{ latitude: user.latitude, longitude: user.longitude }}
      onPress={() => onPress(user)}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 1 }}
      zIndex={isCluster ? 100 : 200}
      style={dimmed ? styles.dimmed : undefined}
    >
      <View style={styles.markerContainer}>
        {isCluster ? (
          <View style={[styles.clusterMarker, { backgroundColor: nbColors.primary }]}>
            <Text style={styles.clusterText}>{clusterCount}</Text>
          </View>
        ) : (
          <>
            <View style={[styles.marker, { backgroundColor: markerColor }]}>
              <MaterialCommunityIcons
                name={roleIcon}
                size={16}
                color={nbColors.white}
              />
            </View>
            <View style={[styles.markerArrow, { borderTopColor: markerColor }]} />
            {/* Always render label placeholder to keep view hierarchy stable on Android
                (prevents bitmap recreation flicker when label appears/disappears) */}
            <Text
              style={[
                styles.nameLabel,
                isCloseZoom ? styles.nameLabelFull : styles.nameLabelAbbrev,
                !label && styles.labelHidden,
              ]}
              numberOfLines={1}
            >
              {label ?? ''}
            </Text>
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
    // Explicit minWidth prevents Android bitmap clipping when label renders
    minWidth: 48,
  },
  dimmed: {
    opacity: 0.2,
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
    fontWeight: nbTypography.fontWeight.bold,
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
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
  },
});
