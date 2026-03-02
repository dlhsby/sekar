/**
 * GPS Location Section
 * Reusable component for displaying and refreshing GPS location.
 * Matches the style of ActivitySubmissionScreen's GPS section.
 * Used in OvertimeSubmitScreen, can be used in any form requiring GPS.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { NBButton } from '../nb';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbBorderRadius,
  nbShadows,
  withAlpha,
} from '../../constants/nbTokens';
import type { Coordinates } from '../../types/models.types';

export interface GPSLocationSectionProps {
  location: Coordinates | null;
  isCapturing: boolean;
  onRefresh: () => void;
  error?: string;
}

export function GPSLocationSection({
  location,
  isCapturing,
  onRefresh,
  error,
}: GPSLocationSectionProps) {
  return (
    <View style={styles.container}>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {isCapturing ? (
        <View style={styles.locationLoading}>
          <ActivityIndicator color={nbColors.primary} />
          <Text style={styles.locationLoadingText}>Mendapatkan lokasi...</Text>
        </View>
      ) : location ? (
        <View style={styles.locationInfo}>
          <Text style={styles.locationText}>
            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </Text>
          {location.accuracy != null && (
            <Text style={styles.locationAccuracy}>
              Akurasi: ±{Math.round(location.accuracy)}m
            </Text>
          )}
        </View>
      ) : (
        <Text style={styles.locationUnavailable}>Lokasi tidak tersedia</Text>
      )}

      <NBButton
        title="Perbarui GPS"
        variant="secondary"
        size="sm"
        onPress={onRefresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: nbSpacing.sm,
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: nbSpacing.md,
  },
  locationLoadingText: {
    marginLeft: nbSpacing.sm,
    color: nbColors.gray['600'],
    fontSize: nbTypography.fontSize.sm,
  },
  locationInfo: {
    padding: nbSpacing.lg,
    backgroundColor: withAlpha(nbColors.accentSky, 0.15),
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  locationText: {
    fontSize: nbTypography.fontSize.lg,
    color: nbColors.black,
    fontWeight: nbTypography.fontWeight.bold,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  locationAccuracy: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray['700'],
    fontWeight: nbTypography.fontWeight.medium,
    marginTop: nbSpacing.sm,
  },
  locationUnavailable: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.danger,
    fontWeight: nbTypography.fontWeight.regular,
  },
  errorText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.danger,
  },
});
