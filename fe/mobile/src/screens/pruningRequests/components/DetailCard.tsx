/**
 * DetailCard — displays tree details (count, height, diameter, scheduling info)
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { NBCard, NBCardHeader, NBCardContent, NBText } from '../../../components/nb';
import { DetailRow } from '../../../components/common/DetailRow';
import { nbColors } from '../../../constants/nbTokens';
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
});

export function DetailCard({ request }: DetailCardProps): React.JSX.Element {
  const treeCount = request.treeCount ?? request.estimatedPlantCount;
  const rows = [
    {
      key: 'treeCount',
      label: 'Jumlah Pohon',
      value: treeCount != null ? `${treeCount} pohon` : '—',
    },
    ...(request.treeHeightEstimate
      ? [{
          key: 'treeHeight',
          label: 'Tinggi (Perkiraan)',
          value: request.treeHeightEstimate,
        }]
      : []),
    ...(request.treeDiameterEstimate
      ? [{
          key: 'treeDiameter',
          label: 'Diameter (Perkiraan)',
          value: request.treeDiameterEstimate,
        }]
      : []),
    {
      key: 'preferredWeek',
      label: 'Minggu Preferensi',
      value: request.expectedYear != null && request.expectedIsoWeek != null
        ? formatIsoWeekLabel(request.expectedYear, request.expectedIsoWeek)
        : 'Tidak ditentukan',
    },
    {
      key: 'scheduledDate',
      label: 'Tanggal Dijadwalkan',
      value: request.scheduledDate ? formatDate(request.scheduledDate) : 'Belum dijadwalkan',
      isLast: true,
    },
  ];

  return (
    <NBCard>
      <NBCardHeader>
        <NBText variant="h2" style={styles.sectionTitle}>
          🌳 DETAIL PERANTINGAN
        </NBText>
      </NBCardHeader>
      <NBCardContent>
        {rows.map((row) => (
          <DetailRow
            key={row.key}
            label={row.label}
            value={row.value}
            isLast={row.isLast}
          />
        ))}
      </NBCardContent>
    </NBCard>
  );
}
