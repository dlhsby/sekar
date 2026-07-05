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
import { useTranslation } from 'react-i18next';
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

function formatUpdatedAt(date: Date | null, t: any): string | null {
  if (!date) return null;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return t('home:components.locationCard.updatedAt.justNow');
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return t('home:components.locationCard.updatedAt.minutesAgo', { minutes: diffMin });
  const diffHr = Math.floor(diffMin / 60);
  return t('home:components.locationCard.updatedAt.hoursAgo', { hours: diffHr });
}

export function LocationStatusCard({ location, onRefresh, onPress }: LocationStatusCardProps) {
  const { t } = useTranslation();
  const hasCoords = location.latitude !== null && location.longitude !== null;
  const accuracyWarning = location.accuracy !== null && location.accuracy > GPS_ACCURACY_WARNING;
  const updatedAtLabel = formatUpdatedAt(location.updatedAt, t);

  const cardContent = (
    <NBCard variant="elevated" style={styles.card} testID="location-status-card">
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <NBText variant="body" color="black" style={styles.cardTitle} accessibilityRole="header">
            {t('home:components.locationCard.title')}
          </NBText>
          {updatedAtLabel && (
            <NBText variant="caption" color="gray500">{updatedAtLabel}</NBText>
          )}
        </View>
        <TouchableOpacity
          onPress={onRefresh}
          disabled={location.loading}
          style={styles.refreshButton}
          accessibilityLabel={t('home:components.locationCard.a11y.refresh')}
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
          <NBText variant="body-sm" color="gray600" style={styles.loadingText}>{t('home:components.locationCard.loading')}</NBText>
        </View>
      ) : location.error ? (
        <NBText variant="body-sm" color="danger">{location.error}</NBText>
      ) : hasCoords ? (
        <View>
          <NBText
            variant="mono-sm"
            color="black"
            style={styles.coordsText}
            accessibilityLabel={t('home:components.locationCard.a11y.coordinates', { lat: location.latitude!.toFixed(6), lon: location.longitude!.toFixed(6) })}
          >
            {location.latitude!.toFixed(6)}, {location.longitude!.toFixed(6)}
          </NBText>

          {location.accuracy !== null && (
            <NBText
              variant="body-sm"
              style={[styles.accuracyText, accuracyWarning && styles.accuracyWarning]}
              accessibilityLabel={t('home:components.locationCard.a11y.accuracy', { accuracy: Math.round(location.accuracy) })}
            >
              {accuracyWarning ? '⚠️ ' : ''}{t('home:components.locationCard.accuracy', { accuracy: Math.round(location.accuracy) })}
            </NBText>
          )}

          {location.isWithinArea ? (
            <View style={styles.insideAreaBanner} accessibilityLabel={t('home:components.locationCard.a11y.insideArea')}>
              <NBText variant="body-sm" style={styles.insideAreaText}>{t('home:components.locationCard.insideArea')}</NBText>
            </View>
          ) : (
            <View style={styles.outsideAreaBanner} accessibilityLabel={t('home:components.locationCard.a11y.outsideArea')}>
              <NBText variant="body-sm" style={styles.outsideAreaText}>{t('home:components.locationCard.outsideArea')}</NBText>
            </View>
          )}
        </View>
      ) : (
        <NBText variant="body-sm" color="gray500" align="center" style={styles.unavailablePad}>{t('home:components.locationCard.unavailable')}</NBText>
      )}

      {onPress && hasCoords && (
        <NBText variant="caption" color="gray500" align="center" style={styles.tapHintPad}>{t('home:components.locationCard.tapHint')}</NBText>
      )}
    </NBCard>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t('home:components.locationCard.a11y.viewOnMap')}
        accessibilityHint={t('home:components.locationCard.a11y.viewOnMapHint')}
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
