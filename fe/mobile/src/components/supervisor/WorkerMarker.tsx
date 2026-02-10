/**
 * WorkerMarker Component
 * Custom map marker showing worker status, role, and position
 *
 * Phase 2 Enhancement: Shows different marker styles for Worker (👷) vs Linmas (🛡️)
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
import type { ActiveWorkerData } from '../../types/api.types';

export type WorkerStatus = 'active' | 'warning' | 'outside';
export type WorkerRole = 'worker' | 'linmas';

interface WorkerMarkerProps {
  worker: ActiveWorkerData;
  status: WorkerStatus;
  onPress: () => void;
  clusterCount?: number; // If provided, renders as a cluster marker
}

/**
 * Get marker color based on worker status
 */
function getMarkerColor(status: WorkerStatus): string {
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

/**
 * Get worker initials from full name
 */
function getInitials(fullName: string): string {
  const names = fullName.trim().split(' ');
  if (names.length === 1) {
    return names[0].substring(0, 2).toUpperCase();
  }
  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
}

/**
 * Get role icon name for MaterialCommunityIcons
 */
function getRoleIcon(role?: WorkerRole): string {
  switch (role) {
    case 'linmas':
      return 'shield-account'; // Security shield icon
    case 'worker':
    default:
      return 'account-hard-hat'; // Worker with hard hat
  }
}

/**
 * Get role label for display
 */
function getRoleLabel(role?: WorkerRole): string {
  switch (role) {
    case 'linmas':
      return 'Linmas';
    case 'worker':
    default:
      return 'Satgas';
  }
}

/**
 * WorkerMarker - Custom marker for worker on map
 */
export function WorkerMarker({ worker, status, onPress, clusterCount }: WorkerMarkerProps): React.JSX.Element | null {
  // Don't render marker if no location data
  if (!worker.latest_location) {
    return null;
  }

  const markerColor = getMarkerColor(status);
  const roleIcon = getRoleIcon(worker.role);
  const roleLabel = getRoleLabel(worker.role);
  const isCluster = clusterCount !== undefined && clusterCount > 1;
  const isLinmas = worker.role === 'linmas';

  return (
    <Marker
      coordinate={{
        latitude: parseFloat(worker.latest_location.gps_lat.toString()),
        longitude: parseFloat(worker.latest_location.gps_lng.toString()),
      }}
      onPress={onPress}
      tracksViewChanges={false} // Performance optimization
    >
      <View style={styles.markerContainer}>
        {isCluster ? (
          // Cluster marker
          <View style={[styles.clusterMarker, { backgroundColor: nbColors.primary }]}>
            <Text style={styles.clusterText}>{clusterCount}</Text>
          </View>
        ) : (
          // Individual worker marker with role-based icon
          <>
            <View style={[
              styles.marker,
              { backgroundColor: markerColor },
              isLinmas && styles.linmasMarker,
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
                color={isLinmas ? nbColors.navy : nbColors.primary}
              />
              <Text style={[styles.calloutRole, isLinmas && styles.linmasRole]}>
                {roleLabel}
              </Text>
            </View>
            <Text style={styles.calloutName}>{worker.full_name}</Text>
            <Text style={styles.calloutArea}>{worker.shift.area.name}</Text>
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
  linmasMarker: {
    // Slightly different shape for Linmas (square-ish rounded)
    borderRadius: 12,
  },
  markerText: {
    color: nbColors.surface,
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
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
    color: nbColors.primary,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linmasRole: {
    color: nbColors.navy,
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
