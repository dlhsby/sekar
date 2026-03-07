/**
 * UserMarker Component
 * Phase 2D: Role-specific icons, four-status colors, name label below marker.
 * Supports both legacy ActiveUserData (for backward compat) and new LiveUser.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbTypography,
  nbShadows,
  nbBorders,
  nbBorderRadius,
} from '../../constants/nbTokens';
import { getStatusColor, getRoleIcon } from '../../utils/mapUtils';
import { ROLE_LABELS } from '../../constants/roles';
import type { LiveUser, UserRole } from '../../types/models.types';
import type { ActiveUserData } from '../../types/api.types';

// ─── Public Types ─────────────────────────────────────────────────────────────

/** @deprecated Use TrackingStatus — kept for backward compatibility */
export type UserStatus = 'active' | 'warning' | 'outside';

// ─── Props ────────────────────────────────────────────────────────────────────

interface UserMarkerProps {
  user: LiveUser;
  onPress: (user: LiveUser) => void;
  showLabel?: boolean;
  clusterCount?: number;
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

// ─── Component ────────────────────────────────────────────────────────────────

export function UserMarker({
  user,
  onPress,
  showLabel = true,
  clusterCount,
}: UserMarkerProps): React.JSX.Element {
  const isCluster = (clusterCount ?? 0) > 1;
  const markerColor = getStatusColor(user.status);
  const roleIcon = getRoleIcon(user.role);
  const roleLabel = getRoleLabel(user.role);
  const firstName = getFirstName(user.full_name);

  return (
    <Marker
      coordinate={{ latitude: user.latitude, longitude: user.longitude }}
      onPress={() => onPress(user)}
      tracksViewChanges={false}
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
                size={20}
                color={nbColors.white}
              />
            </View>
            <View style={[styles.markerArrow, { borderTopColor: markerColor }]} />
            {showLabel && (
              <Text style={styles.nameLabel} numberOfLines={1}>
                {firstName}
              </Text>
            )}
          </>
        )}
      </View>

      {!isCluster && (
        <Callout tooltip>
          <View style={styles.calloutContainer}>
            <View style={styles.calloutHeader}>
              <MaterialCommunityIcons
                name={roleIcon}
                size={16}
                color={markerColor}
              />
              <Text style={[styles.calloutRole, { color: markerColor }]}>
                {roleLabel}
              </Text>
            </View>
            <Text style={styles.calloutName}>{user.full_name}</Text>
            <Text style={styles.calloutArea}>{user.area_name}</Text>
          </View>
        </Callout>
      )}
    </Marker>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
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
    maxWidth: 60,
    textAlign: 'center',
    marginTop: 2,
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
  calloutContainer: {
    backgroundColor: nbColors.surface,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    padding: 12,
    minWidth: 150,
    ...nbShadows.lg,
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  calloutRole: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calloutName: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
    marginBottom: 4,
  },
  calloutArea: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['600'],
  },
});
