/**
 * UserMarker Component
 * Custom map marker showing user status, role, and position
 *
 * Phase 2C: Supports all 5 clockable roles with distinct markers
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
import type { ActiveUserData } from '../../types/api.types';
import type { UserRole } from '../../types/models.types';
import { ROLE_LABELS } from '../../constants/roles';

export type UserStatus = 'active' | 'warning' | 'outside';

interface UserMarkerProps {
  user: ActiveUserData;
  status: UserStatus;
  onPress: () => void;
  clusterCount?: number;
}

function getMarkerColor(status: UserStatus): string {
  switch (status) {
    case 'active':
      return nbColors.successDark;
    case 'warning':
      return nbColors.warning;
    case 'outside':
      return nbColors.dangerDark;
    default:
      return nbColors.gray['500'];
  }
}

function getRoleIcon(role?: UserRole | string): string {
  switch (role) {
    case 'linmas':
      return 'shield-account';
    case 'korlap':
      return 'clipboard-account';
    case 'admin_data':
      return 'file-document-edit';
    case 'kepala_rayon':
      return 'account-star';
    case 'satgas':
    default:
      return 'account-hard-hat';
  }
}

function getRoleLabel(role?: UserRole | string): string {
  if (role && role in ROLE_LABELS) {
    return ROLE_LABELS[role as UserRole];
  }
  return 'Satgas';
}

function getRoleColor(role?: UserRole | string): string {
  switch (role) {
    case 'linmas':
      return nbColors.navy;
    case 'korlap':
      return nbColors.accentSky;
    case 'admin_data':
      return nbColors.warning;
    case 'kepala_rayon':
      return nbColors.primary;
    case 'satgas':
    default:
      return nbColors.primary;
  }
}

/**
 * UserMarker - Custom marker for user on map
 */
export function UserMarker({ user, status, onPress, clusterCount }: UserMarkerProps): React.JSX.Element | null {
  if (!user.latest_location) {
    return null;
  }

  const markerColor = getMarkerColor(status);
  const roleIcon = getRoleIcon(user.role);
  const roleLabel = getRoleLabel(user.role);
  const roleColor = getRoleColor(user.role);
  const isCluster = clusterCount !== undefined && clusterCount > 1;
  const isNonSatgas = user.role !== 'satgas' && user.role !== undefined;

  return (
    <Marker
      coordinate={{
        latitude: parseFloat(user.latest_location.gps_lat.toString()),
        longitude: parseFloat(user.latest_location.gps_lng.toString()),
      }}
      onPress={onPress}
      tracksViewChanges={false}
    >
      <View style={styles.markerContainer}>
        {isCluster ? (
          <View style={[styles.clusterMarker, { backgroundColor: nbColors.primary }]}>
            <Text style={styles.clusterText}>{clusterCount}</Text>
          </View>
        ) : (
          <>
            <View style={[
              styles.marker,
              { backgroundColor: markerColor },
              isNonSatgas && styles.nonSatgasMarker,
            ]}>
              <MaterialCommunityIcons
                name={roleIcon}
                size={20}
                color={nbColors.surface}
              />
            </View>
            <View style={[styles.markerArrow, { borderTopColor: markerColor }]} />
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
                color={roleColor}
              />
              <Text style={[styles.calloutRole, { color: roleColor }]}>
                {roleLabel}
              </Text>
            </View>
            <Text style={styles.calloutName}>{user.full_name}</Text>
            <Text style={styles.calloutArea}>{user.shift.area.name}</Text>
          </View>
        </Callout>
      )}
    </Marker>
  );
}

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
    borderWidth: 3,
    borderColor: nbColors.surface,
    ...nbShadows.md,
  },
  nonSatgasMarker: {
    borderRadius: 12,
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
  clusterMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: nbColors.surface,
    ...nbShadows.lg,
  },
  clusterText: {
    color: nbColors.surface,
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
  },
  calloutRole: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.semibold,
    marginLeft: 4,
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
