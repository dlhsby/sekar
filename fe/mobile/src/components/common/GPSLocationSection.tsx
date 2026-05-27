/**
 * GPS Location Section
 * Reusable component for displaying and refreshing GPS location.
 * Used in OvertimeSubmitScreen and any form requiring GPS capture.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { NBButton, NBText } from '../nb';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
  nbShadows,
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
      {error ? <NBText variant="body-sm" color="danger">{error}</NBText> : null}

      {isCapturing ? (
        <View style={styles.locationLoading}>
          <ActivityIndicator color={nbColors.primary} />
          <NBText variant="body-sm" color="gray600" style={{ marginLeft: nbSpacing.sm }}>
            Mendapatkan lokasi...
          </NBText>
        </View>
      ) : location ? (
        <View style={styles.locationInfo}>
          <NBText variant="body-sm" color="black" style={styles.locationText}>
            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </NBText>
          {location.accuracy != null && (
            <NBText variant="caption" color="gray600" style={{ marginTop: nbSpacing.xs }}>
              Akurasi: ±{Math.round(location.accuracy)}m
            </NBText>
          )}
        </View>
      ) : (
        <NBText variant="body-sm" color="danger">Lokasi tidak tersedia</NBText>
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
    padding: nbSpacing.sm,
  },
  locationInfo: {
    padding: nbSpacing.md,
    backgroundColor: nbColors.gray50,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  locationText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },
});
