/**
 * OvertimeGpsCard — Displays GPS coordinates
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  NBCard,
  NBCardHeader,
  NBCardContent,
  NBText,
} from '../../../components/nb';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
  nbShadows,
} from '../../../constants/nbTokens';
import { formatGps } from '../../../utils/gpsFormat';

interface OvertimeGpsCardProps {
  gpsLat?: number;
  gpsLng?: number;
}

export const OvertimeGpsCard: React.FC<OvertimeGpsCardProps> = ({ gpsLat, gpsLng }) => {
  const { t } = useTranslation();
  if (gpsLat == null || gpsLng == null) return null;

  return (
    <NBCard style={styles.card}>
      <NBCardHeader>
        <View style={styles.sectionHeaderRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={14} color={nbColors.gray700} style={{ marginRight: nbSpacing.xs }} />
          <NBText variant="mono-sm" color="gray700" uppercase style={{ letterSpacing: 0.6 }}>{t('overtime:gpsCard.header')}</NBText>
        </View>
      </NBCardHeader>
      <NBCardContent>
        <View style={styles.locationContainer}>
          <NBText variant="body-sm" color="black" style={styles.locationText}>
            {formatGps(gpsLat, gpsLng)}
          </NBText>
        </View>
      </NBCardContent>
    </NBCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    ...nbShadows.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationContainer: {
    padding: nbSpacing.md,
    backgroundColor: nbColors.gray50,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
  },
  locationText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },
});
