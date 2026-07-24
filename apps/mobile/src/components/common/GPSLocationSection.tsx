import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  /** Worker has no assigned area at all (ad-hoc) — neutral note, not within/outside. */
  noArea?: boolean;
  /**
   * Assigned city/rayon/kawasan-wide: there is no polygon to test against, but
   * the worker IS assigned. Shown instead of the "no area" note, which was
   * telling a city-scope satgas he had no assignment.
   */
  scopeLabel?: string;
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
  noArea,
  scopeLabel,
  areaName,
}: GPSLocationSectionProps) {
  const { t } = useTranslation('attendance');
  const hasLocation = latitude != null && longitude != null;

  const iconName = hasLocation ? 'crosshairs-gps' : 'crosshairs';
  const iconColor = hasLocation
    ? noArea
      ? nbColors.gray500
      : isWithinBoundary === false
        ? nbColors.statusOutside
        : nbColors.statusActive
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
          {/* Short status only — the precise coordinates + accuracy live in the
              detail block below, so showing them here too was a duplicate. */}
          <NBText variant="body-sm" color={hasLocation ? 'black' : 'gray600'}>
            {isCapturing
              ? t('gpsSection.capturingLocation')
              : hasLocation
                ? (areaName ?? t('gpsSection.locationRecorded'))
                : t('gpsSection.locationUnavailable')}
          </NBText>
        </View>
      </View>

      {/* Area status alert — neutral note when unassigned, else within/outside */}
      {hasLocation && scopeLabel ? (
        <NBAlert variant="info" message={t('gpsSection.scopeAssigned', { scope: scopeLabel })} />
      ) : hasLocation && noArea ? (
        <NBAlert variant="info" message={t('gpsSection.noArea')} />
      ) : hasLocation && isWithinBoundary !== undefined ? (
        <View>
          {isWithinBoundary ? (
            <NBAlert variant="success" message={t('gpsSection.withinBoundary')} />
          ) : (
            <NBAlert variant="warning" message={t('gpsSection.outsideBoundary')} />
          )}
        </View>
      ) : null}

      {/* Full coordinate detail */}
      {hasLocation && (
        <View style={styles.detailRow}>
          <View style={styles.infoRow}>
            <NBText variant="body-sm" color="gray700">{t('gpsSection.gpsLabel')}</NBText>
            <NBText variant="body-sm" color="black">
              {latitude!.toFixed(6)}, {longitude!.toFixed(6)}
            </NBText>
          </View>
          {accuracy != null && (
            <View style={styles.infoRow}>
              <NBText variant="body-sm" color="gray700">{t('gpsSection.accuracyLabel')}</NBText>
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
                {t('gpsSection.lowAccuracyWarning')}
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
        title={t('gpsSection.updateGpsButton')}
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
