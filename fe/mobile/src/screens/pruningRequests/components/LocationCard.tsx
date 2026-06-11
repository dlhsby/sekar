/**
 * LocationCard — displays location info (kecamatan, rayon, address, GPS) with map button
 */

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
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
  const hasGps = request.gpsLat != null && request.gpsLng != null;

  return (
    <NBCard>
      <NBCardHeader>
        <NBText variant="h2" style={styles.sectionTitle}>
          📍 LOKASI
        </NBText>
      </NBCardHeader>
      <NBCardContent>
        {request.kecamatanName ? (
          <DetailRow
            label="Kecamatan"
            value={request.kecamatanName}
          />
        ) : null}
        {request.rayon?.name ? (
          <DetailRow
            label="Rayon"
            value={request.rayon.name}
          />
        ) : null}
        <DetailRow
          label="Alamat"
          value={request.address || '—'}
        />
        <DetailRow
          label="Koordinat GPS"
          value={formatGps(request.gpsLat, request.gpsLng)}
          variant="mono"
        />
        {hasGps ? (
          <TouchableOpacity
            onPress={onMapPress}
            accessibilityRole="button"
            accessibilityLabel="Lihat lokasi di peta"
            style={styles.viewMapCta}
            testID="perantingan-gps-row"
          >
            <MaterialCommunityIcons name="map-search" size={20} color={nbColors.primary} />
            <NBText variant="body" style={styles.viewMapCtaText}>
              Lihat di Peta
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
            Lokasi belum tersedia untuk dilihat di peta.
          </NBText>
        )}
      </NBCardContent>
    </NBCard>
  );
}
