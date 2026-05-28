import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBAlert, NBButton, NBText } from '../nb';
import { nbColors, nbSpacing, nbBorders, nbRadius } from '../../constants/nbTokens';
import config from '../../constants/config';

export interface GPSLocationSectionProps {
  latitude: number | null;
  longitude: number | null;
  accuracy?: number | null;
  isCapturing: boolean;
  onRefresh: () => void;
  error?: string | null;
  isWithinBoundary?: boolean;
  areaName?: string;
}

export function GPSLocationSection({
  latitude,
  longitude,
  accuracy,
  isCapturing,
  onRefresh,
  error,
  isWithinBoundary,
  areaName,
}: GPSLocationSectionProps) {
  const hasLocation = latitude != null && longitude != null;

  const iconName = hasLocation ? 'crosshairs-gps' : 'crosshairs';
  const iconColor = hasLocation
    ? (isWithinBoundary === false ? nbColors.statusOutside : nbColors.statusActive)
    : nbColors.gray500;

  return (
    <View style={styles.container}>

      {/* Status row — icon + primary text + accuracy */}
      <View style={styles.statusRow}>
        {isCapturing ? (
          <ActivityIndicator size="small" color={nbColors.primary} style={{ marginRight: nbSpacing.sm }} />
        ) : (
          <MaterialCommunityIcons
            name={iconName}
            size={18}
            color={iconColor}
            style={{ marginRight: nbSpacing.sm }}
          />
        )}
        <View style={{ flex: 1 }}>
          <NBText variant="body-sm" color={hasLocation ? 'black' : 'gray600'}>
            {isCapturing
              ? 'Mendapatkan lokasi...'
              : hasLocation
                ? (areaName ?? `${latitude!.toFixed(4)}, ${longitude!.toFixed(4)}`)
                : 'Lokasi tidak tersedia'}
          </NBText>
          {hasLocation && accuracy != null && (
            <NBText variant="caption" color="gray600">
              ±{Math.round(accuracy)}m akurasi
            </NBText>
          )}
        </View>
      </View>

      {/* Area status alert — only when boundary check is provided */}
      {hasLocation && isWithinBoundary !== undefined && (
        <View>
          {isWithinBoundary ? (
            <NBAlert variant="success" message="Anda berada di dalam area kerja" />
          ) : (
            <NBAlert variant="warning" message="Anda berada di luar area kerja. Absen tetap dicatat." />
          )}
        </View>
      )}

      {/* Full coordinate detail */}
      {hasLocation && (
        <View style={styles.detailRow}>
          <View style={styles.infoRow}>
            <NBText variant="body-sm" color="gray700">GPS:</NBText>
            <NBText variant="body-sm" color="black">
              {latitude!.toFixed(6)}, {longitude!.toFixed(6)}
            </NBText>
          </View>
          {accuracy != null && (
            <View style={styles.infoRow}>
              <NBText variant="body-sm" color="gray700">Akurasi:</NBText>
              <NBText variant="body-sm" color="black">{Math.round(accuracy)}m</NBText>
            </View>
          )}
          {accuracy != null && accuracy > config.GPS_ACCURACY_THRESHOLD && (
            <View style={styles.warningBox}>
              <MaterialCommunityIcons
                name="crosshairs-question"
                size={18}
                color={nbColors.statusIdle}
                style={{ marginRight: nbSpacing.sm }}
              />
              <NBText variant="body-sm" color="gray700" style={{ flex: 1 }}>
                GPS kurang akurat. Pindah ke area terbuka untuk hasil lebih baik.
              </NBText>
            </View>
          )}
        </View>
      )}

      {/* Error */}
      {error ? (
        <NBText variant="body-sm" color="danger">{error}</NBText>
      ) : null}

      {/* Refresh button */}
      <NBButton
        title="Perbarui GPS"
        variant="secondary"
        size="sm"
        onPress={onRefresh}
        disabled={isCapturing}
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: nbSpacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailRow: {
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    backgroundColor: nbColors.gray50,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.gray300,
    gap: nbSpacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: nbSpacing.xs,
    borderTopWidth: nbBorders.widthThin,
    borderTopColor: nbColors.gray200,
    marginTop: nbSpacing.xs,
  },
});
