/**
 * LocationCard — displays location info (kecamatan, district, address, GPS) with map button
 */

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBCard, NBCardHeader, NBCardContent, NBText } from '../../../components/nb';
import { DetailRow } from '../../../components/common/DetailRow';
import { nbColors, nbSpacing, nbBorders, nbRadius } from '../../../constants/nbTokens';
import { formatGps } from '../../../utils/gpsFormat';
import type { PruningRequest } from '../../../types/models.types';

interface LocationCardProps {
  request: PruningRequest;
  onMapPress: () => void;
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: nbColors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewMapCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing[2],
    paddingVertical: nbSpacing[3],
    paddingHorizontal: nbSpacing[3],
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.primary,
    borderRadius: nbRadius.base,
    backgroundColor: nbColors.gray100,
    marginBottom: nbSpacing.md,
  },
  viewMapCtaText: {
    color: nbColors.primary,
  },
  gpsHint: {
    color: nbColors.gray500,
    fontStyle: 'italic',
    paddingVertical: nbSpacing[2],
  },
});

export function LocationCard({ request, onMapPress }: LocationCardProps): React.JSX.Element {
  const { t } = useTranslation('pruning');
  const hasGps = request.gpsLat != null && request.gpsLng != null;

  return (
    <NBCard>
      <NBCardHeader>
        <NBText variant="h2" style={styles.sectionTitle}>
          {t('locationCard.sectionTitle')}
        </NBText>
      </NBCardHeader>
      <NBCardContent>
        {request.kecamatanName ? (
          <DetailRow
            label={t('locationCard.kecamatanLabel')}
            value={request.kecamatanName}
          />
        ) : null}
        {request.district?.name ? (
          <DetailRow
            label={t('locationCard.districtLabel')}
            value={request.district.name}
          />
        ) : null}
        <DetailRow
          label={t('locationCard.addressLabel')}
          value={request.address || '—'}
        />
        <DetailRow
          label={t('locationCard.gpsLabel')}
          value={formatGps(request.gpsLat, request.gpsLng)}
          variant="mono"
        />
        {hasGps ? (
          <TouchableOpacity
            onPress={onMapPress}
            accessibilityRole="button"
            accessibilityLabel={t('locationCard.mapButtonAccessibility')}
            style={styles.viewMapCta}
            testID="perantingan-gps-row"
          >
            <MaterialCommunityIcons name="map-search" size={20} color={nbColors.primary} />
            <NBText variant="body" style={styles.viewMapCtaText}>
              {t('locationCard.mapButtonLabel')}
            </NBText>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={nbColors.primary}
              style={{ marginLeft: 'auto' }}
            />
          </TouchableOpacity>
        ) : (
          <NBText variant="body-sm" style={styles.gpsHint}>
            {t('locationCard.gpsUnavailable')}
          </NBText>
        )}
      </NBCardContent>
    </NBCard>
  );
}
