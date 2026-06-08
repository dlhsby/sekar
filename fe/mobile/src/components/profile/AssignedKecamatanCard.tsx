/**
 * AssignedKecamatanCard
 * Profile card shown only for `staff_kecamatan` users — surfaces the rayon
 * + kecamatan they are pinned to, mirroring the satgas/korlap "Area
 * Ditugaskan" card. Added May 9, 2026 (kecamatan UX review).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  nbColors,
  nbTypography,
  nbSpacing,
  nbRadius,
  nbBorders,
  nbShadows,
} from '../../constants/nbTokens';
import { NBCard } from '../nb';

interface AssignedKecamatanCardProps {
  rayonName?: string | null;
  kecamatanName?: string | null;
  testID?: string;
}

export const AssignedKecamatanCard: React.FC<AssignedKecamatanCardProps> = ({
  rayonName,
  kecamatanName,
  testID = 'assigned-kecamatan-card',
}) => {
  return (
    <NBCard variant="elevated" style={styles.card} testID={testID}>
      <Text style={styles.cardTitle}>Wilayah Ditugaskan</Text>
      {kecamatanName || rayonName ? (
        <View style={styles.body}>
          <View style={styles.row}>
            <Text style={styles.label}>Rayon</Text>
            <Text style={styles.value}>{rayonName ?? '—'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Kecamatan</Text>
            <Text style={styles.value}>{kecamatanName ?? '—'}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.empty}>Belum ada wilayah ditugaskan</Text>
      )}
    </NBCard>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: nbColors.white,
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    padding: nbSpacing.md,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  cardTitle: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
    marginBottom: nbSpacing.md,
  },
  body: {
    paddingTop: nbSpacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: nbSpacing.xs,
  },
  label: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray600,
    fontWeight: nbTypography.fontWeight.medium,
  },
  value: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  divider: {
    height: 1,
    backgroundColor: nbColors.gray200,
    marginVertical: nbSpacing.xs,
  },
  empty: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray500,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: nbSpacing.md,
  },
});
