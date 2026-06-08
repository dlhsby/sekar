/**
 * LocationStatusCard
 * Shows current GPS position and area boundary status on HomeScreen.
 * Phase 2D-11: Home Screen Location Card
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBCard } from '../nb';
import { NBText } from '../nb/NBText';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
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
    updatedAt: Date | null;
  };
  onRefresh: () => void;
  onPress?: () => void;
}

function formatUpdatedAt(date: Date | null): string | null {
  if (!date) return null;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr} jam lalu`;
}

export function LocationStatusCard({ location, onRefresh, onPress }: LocationStatusCardProps) {
  const hasCoords = location.latitude !== null && location.longitude !== null;
  const accuracyWarning = location.accuracy !== null && location.accuracy > GPS_ACCURACY_WARNING;
  const updatedAtLabel = formatUpdatedAt(location.updatedAt);

  const cardContent = (
    <NBCard variant="elevated" style={styles.card} testID="location-status-card">
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <NBText variant="body" color="black" style={styles.cardTitle} accessibilityRole="header">
            Lokasi Anda
          </NBText>
          {updatedAtLabel && (
            <NBText variant="caption" color="gray500">{updatedAtLabel}</NBText>
          )}
        </View>
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
            color={location.loading ? nbColors.gray400 : nbColors.primary}
          />
        </TouchableOpacity>
      </View>

      {location.loading && !hasCoords ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={nbColors.primary} size="small" />
          <NBText variant="body-sm" color="gray600" style={styles.loadingText}>Mendapatkan lokasi...</NBText>
        </View>
      ) : location.error ? (
        <NBText variant="body-sm" color="danger">{location.error}</NBText>
      ) : hasCoords ? (
        <View>
          <NBText
            variant="mono-sm"
            color="black"
            style={styles.coordsText}
            accessibilityLabel={`Koordinat: ${location.latitude!.toFixed(6)}, ${location.longitude!.toFixed(6)}`}
          >
            {location.latitude!.toFixed(6)}, {location.longitude!.toFixed(6)}
          </NBText>

          {location.accuracy !== null && (
            <NBText
              variant="body-sm"
              style={[styles.accuracyText, accuracyWarning && styles.accuracyWarning]}
              accessibilityLabel={`Akurasi GPS: plus minus ${Math.round(location.accuracy)} meter`}
            >
              {accuracyWarning ? '⚠️ ' : ''}Akurasi: ±{Math.round(location.accuracy)}m
            </NBText>
          )}

          {location.isWithinArea ? (
            <View style={styles.insideAreaBanner} accessibilityLabel="Di dalam area kerja">
              <NBText variant="body-sm" style={styles.insideAreaText}>Di dalam area kerja</NBText>
            </View>
          ) : (
            <View style={styles.outsideAreaBanner} accessibilityLabel="Di luar area kerja">
              <NBText variant="body-sm" style={styles.outsideAreaText}>Di luar area kerja</NBText>
            </View>
          )}
        </View>
      ) : (
        <NBText variant="body-sm" color="gray500" align="center" style={styles.unavailablePad}>Lokasi tidak tersedia</NBText>
      )}

      {onPress && hasCoords && (
        <NBText variant="caption" color="gray500" align="center" style={styles.tapHintPad}>Ketuk untuk lihat di peta</NBText>
      )}
    </NBCard>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Lihat lokasi di peta"
        accessibilityHint="Ketuk untuk membuka peta lokasi"
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  card: {
    marginBottom: nbSpacing.sm,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: nbSpacing.xs,
  },
  titleRow: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: '700',
  },
  refreshButton: {
    padding: 4,
    marginLeft: nbSpacing.sm,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nbSpacing.sm,
  },
  loadingText: {
    marginLeft: nbSpacing.sm,
  },
  coordsText: {
    // mono-sm variant; override font-family for platform monospace fallback
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: nbSpacing.xs,
  },
  accuracyText: {
    color: nbColors.gray700,
    marginBottom: nbSpacing.sm,
  },
  accuracyWarning: {
    color: nbColors.warning,
  },
  insideAreaBanner: {
    backgroundColor: withAlpha(nbColors.successDark, 0.15),
    borderColor: nbColors.successDark,
    borderWidth: nbBorders.widthBase,
    borderRadius: nbRadius.base,
    paddingVertical: nbSpacing.xs,
    paddingHorizontal: nbSpacing.sm,
  },
  insideAreaText: {
    fontWeight: '700',
    color: nbColors.successDark,
    textAlign: 'center',
  },
  outsideAreaBanner: {
    backgroundColor: withAlpha(nbColors.statusIdle, 0.15),
    borderColor: nbColors.statusIdle,
    borderWidth: nbBorders.widthBase,
    borderRadius: nbRadius.base,
    paddingVertical: nbSpacing.xs,
    paddingHorizontal: nbSpacing.sm,
  },
  outsideAreaText: {
    fontWeight: '700',
    color: nbColors.statusIdle,
    textAlign: 'center',
  },
  unavailablePad: {
    paddingVertical: nbSpacing.sm,
  },
  tapHintPad: {
    marginTop: nbSpacing.sm,
    fontStyle: 'italic',
  },
});
