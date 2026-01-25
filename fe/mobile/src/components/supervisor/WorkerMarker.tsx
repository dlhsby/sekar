/**
 * WorkerMarker Component
 * Custom map marker showing worker status and position
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { colors, typography, shadows } from '../../constants/theme';
import type { ActiveWorkerData } from '../../types/api.types';

export type WorkerStatus = 'active' | 'warning' | 'outside';

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
      return colors.success;
    case 'warning':
      return colors.warning;
    case 'outside':
      return colors.error;
    default:
      return colors.gray500;
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
 * WorkerMarker - Custom marker for worker on map
 */
export function WorkerMarker({ worker, status, onPress, clusterCount }: WorkerMarkerProps): React.JSX.Element | null {
  // Don't render marker if no location data
  if (!worker.latest_location) {
    return null;
  }

  const markerColor = getMarkerColor(status);
  const initials = getInitials(worker.full_name);
  const isCluster = clusterCount !== undefined && clusterCount > 1;

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
          <View style={[styles.clusterMarker, { backgroundColor: colors.primary }]}>
            <Text style={styles.clusterText}>{clusterCount}</Text>
          </View>
        ) : (
          // Individual worker marker
          <>
            <View style={[styles.marker, { backgroundColor: markerColor }]}>
              <Text style={styles.markerText}>{initials}</Text>
            </View>
            <View style={[styles.markerArrow, { borderTopColor: markerColor }]} />
          </>
        )}
      </View>

      {!isCluster && (
        <Callout tooltip>
          <View style={styles.calloutContainer}>
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
    borderColor: colors.white,
    ...shadows.md,
  },
  markerText: {
    color: colors.white,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
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
    borderColor: colors.white,
    ...shadows.lg,
  },
  clusterText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
  calloutContainer: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 12,
    minWidth: 150,
    ...shadows.lg,
  },
  calloutName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  calloutArea: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
});
