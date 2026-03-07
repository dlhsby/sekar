/**
 * LocationStatusCard
 * Shows current GPS position and area boundary status on HomeScreen.
 * Phase 2D-11: Home Screen Location Card
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBCard } from '../nb';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbBorderRadius,
  withAlpha,
} from '../../constants/nbTokens';

const GPS_ACCURACY_WARNING = 50;

interface LocationStatusCardProps {
  location: {
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    isWithinArea: boolean;
    loading: boolean;
    error: string | null;
  };
  onRefresh: () => void;
}

export function LocationStatusCard({ location, onRefresh }: LocationStatusCardProps) {
  const hasCoords = location.latitude !== null && location.longitude !== null;
  const accuracyWarning = location.accuracy !== null && location.accuracy > GPS_ACCURACY_WARNING;

  return (
    <NBCard
      variant="elevated"
      style={styles.card}
      testID="location-status-card"
    >
      <View style={styles.header}>
        <Text
          style={styles.cardTitle}
          accessibilityRole="header"
        >
          Lokasi Anda
        </Text>
        <TouchableOpacity
          onPress={onRefresh}
          disabled={location.loading}
          style={styles.refreshButton}
          accessibilityLabel="Perbarui lokasi"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons
            name="refresh"
            size={20}
            color={location.loading ? nbColors.gray['400'] : nbColors.primary}
          />
        </TouchableOpacity>
      </View>

      {location.loading && !hasCoords ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={nbColors.primary} size="small" />
          <Text style={styles.loadingText}>Mendapatkan lokasi...</Text>
        </View>
      ) : location.error ? (
        <View>
          <Text style={styles.errorText}>{location.error}</Text>
        </View>
      ) : hasCoords ? (
        <View>
          <Text
            style={styles.coordsText}
            accessibilityLabel={`Koordinat: ${location.latitude!.toFixed(6)}, ${location.longitude!.toFixed(6)}`}
          >
            {location.latitude!.toFixed(6)}, {location.longitude!.toFixed(6)}
          </Text>

          {location.accuracy !== null && (
            <Text
              style={[styles.accuracyText, accuracyWarning && styles.accuracyWarning]}
              accessibilityLabel={`Akurasi GPS: plus minus ${Math.round(location.accuracy)} meter`}
            >
              {accuracyWarning ? '⚠️ ' : ''}Akurasi: ±{Math.round(location.accuracy)}m
            </Text>
          )}

          {location.isWithinArea ? (
            <View
              style={styles.insideAreaBanner}
              accessibilityLabel="Di dalam area kerja"
            >
              <Text style={styles.insideAreaText}>Di dalam area kerja</Text>
            </View>
          ) : (
            <View
              style={styles.outsideAreaBanner}
              accessibilityLabel="Di luar area kerja"
            >
              <Text style={styles.outsideAreaText}>Di luar area kerja</Text>
            </View>
          )}
        </View>
      ) : (
        <Text style={styles.unavailableText}>Lokasi tidak tersedia</Text>
      )}
    </NBCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: nbSpacing.sm,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: nbSpacing.xs,
  },
  cardTitle: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  refreshButton: {
    padding: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nbSpacing.sm,
  },
  loadingText: {
    marginLeft: nbSpacing.sm,
    color: nbColors.gray['600'],
    fontSize: nbTypography.fontSize.sm,
  },
  coordsText: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.black,
    fontWeight: nbTypography.fontWeight.bold,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: nbSpacing.xs,
  },
  accuracyText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['700'],
    fontWeight: nbTypography.fontWeight.medium,
    marginBottom: nbSpacing.sm,
  },
  accuracyWarning: {
    color: nbColors.warning,
  },
  insideAreaBanner: {
    backgroundColor: withAlpha('#15803D', 0.15),
    borderColor: '#15803D',
    borderWidth: nbBorders.base,
    borderRadius: nbBorderRadius.base,
    paddingVertical: nbSpacing.xs,
    paddingHorizontal: nbSpacing.sm,
  },
  insideAreaText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: '#15803D',
    textAlign: 'center',
  },
  outsideAreaBanner: {
    backgroundColor: withAlpha('#D97706', 0.15),
    borderColor: '#D97706',
    borderWidth: nbBorders.base,
    borderRadius: nbBorderRadius.base,
    paddingVertical: nbSpacing.xs,
    paddingHorizontal: nbSpacing.sm,
  },
  outsideAreaText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: '#D97706',
    textAlign: 'center',
  },
  errorText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.danger,
  },
  unavailableText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['500'],
    textAlign: 'center',
    paddingVertical: nbSpacing.sm,
  },
});
