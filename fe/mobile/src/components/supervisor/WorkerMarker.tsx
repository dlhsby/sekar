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
import { colors, typography, shadows } from '../../constants/theme';
import type { ActiveWorkerData } from '../../types/api.types';

export type WorkerStatus = 'active' | 'warning' | 'outside';
export type WorkerRole = 'Worker' | 'Linmas';

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
 * Get role icon name for MaterialCommunityIcons
 */
function getRoleIcon(role?: WorkerRole): string {
  switch (role) {
    case 'Linmas':
      return 'shield-account'; // Security shield icon
    case 'Worker':
    default:
      return 'account-hard-hat'; // Worker with hard hat
  }
}

/**
 * Get role label for display
 */
function getRoleLabel(role?: WorkerRole): string {
  switch (role) {
    case 'Linmas':
      return 'Linmas';
    case 'Worker':
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
  const isLinmas = worker.role === 'Linmas';

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
                color={colors.white}
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
                color={isLinmas ? colors.secondaryDark : colors.primary}
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
    borderColor: colors.white,
    ...shadows.md,
  },
  linmasMarker: {
    // Slightly different shape for Linmas (square-ish rounded)
    borderRadius: 12,
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
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  calloutRole: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linmasRole: {
    color: colors.secondaryDark,
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
