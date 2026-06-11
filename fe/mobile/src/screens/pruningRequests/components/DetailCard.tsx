/**
 * DetailCard — displays tree details (count, height, diameter, scheduling info)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NBCard, NBCardHeader, NBCardContent, NBText } from '../../../components/nb';
import { nbColors, nbSpacing } from '../../../constants/nbTokens';
import { formatDate, formatIsoWeekLabel } from '../../../utils/dateUtils';
import type { PruningRequest } from '../../../types/models.types';

interface DetailCardProps {
  request: PruningRequest;
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: nbColors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    marginBottom: nbSpacing.md,
  },
  label: {
    color: nbColors.gray700,
    marginBottom: nbSpacing.xs,
  },
  value: {
    color: nbColors.black,
  },
});

export function DetailCard({ request }: DetailCardProps): React.JSX.Element {
  const treeCount = request.treeCount ?? request.estimatedPlantCount;

  return (
    <NBCard>
      <NBCardHeader>
        <NBText variant="h2" style={styles.sectionTitle}>
          🌳 DETAIL PERANTINGAN
        </NBText>
      </NBCardHeader>
      <NBCardContent>
        <View style={styles.infoRow}>
          <NBText variant="body-sm" style={styles.label}>
            Jumlah Pohon
          </NBText>
          <NBText variant="body" style={styles.value}>
            {treeCount != null ? `${treeCount} pohon` : '—'}
          </NBText>
        </View>
        {request.treeHeightEstimate ? (
          <View style={styles.infoRow}>
            <NBText variant="body-sm" style={styles.label}>
              Tinggi (Perkiraan)
            </NBText>
            <NBText variant="body" style={styles.value}>
              {request.treeHeightEstimate}
            </NBText>
          </View>
        ) : null}
        {request.treeDiameterEstimate ? (
          <View style={styles.infoRow}>
            <NBText variant="body-sm" style={styles.label}>
              Diameter (Perkiraan)
            </NBText>
            <NBText variant="body" style={styles.value}>
              {request.treeDiameterEstimate}
            </NBText>
          </View>
        ) : null}
        <View style={styles.infoRow}>
          <NBText variant="body-sm" style={styles.label}>
            Minggu Preferensi
          </NBText>
          <NBText variant="body" style={styles.value}>
            {request.expectedYear != null && request.expectedIsoWeek != null
              ? formatIsoWeekLabel(request.expectedYear, request.expectedIsoWeek)
              : 'Tidak ditentukan'}
          </NBText>
        </View>
        <View style={[styles.infoRow, { marginBottom: 0 }]}>
          <NBText variant="body-sm" style={styles.label}>
            Tanggal Dijadwalkan
          </NBText>
          <NBText variant="body" style={styles.value}>
            {request.scheduledDate ? formatDate(request.scheduledDate) : 'Belum dijadwalkan'}
          </NBText>
        </View>
      </NBCardContent>
    </NBCard>
  );
}
