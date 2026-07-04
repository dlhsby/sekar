/**
 * AssignedKecamatanCard
 * Profile card shown only for `staff_kecamatan` users — surfaces the rayon
 * + kecamatan they are pinned to, mirroring the satgas/korlap "Area
 * Ditugaskan" card. Added May 9, 2026 (kecamatan UX review).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  nbColors,
  nbType,
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
  const { t } = useTranslation();
  return (
    <NBCard variant="elevated" style={styles.card} testID={testID}>
      <Text style={styles.cardTitle}>{t('profile:assignedKecamatan.title')}</Text>
      {kecamatanName || rayonName ? (
        <View style={styles.body}>
          <View style={styles.row}>
            <Text style={styles.label}>{t('profile:assignedKecamatan.rayon')}</Text>
            <Text style={styles.value}>{rayonName ?? '—'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>{t('profile:assignedKecamatan.kecamatan')}</Text>
            <Text style={styles.value}>{kecamatanName ?? '—'}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.empty}>{t('profile:assignedKecamatan.noArea')}</Text>
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
    fontSize: nbType.body.fontSize,
    fontWeight: nbType.h2.fontWeight,
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
    fontSize: nbType.bodySm.fontSize,
    color: nbColors.gray600,
    fontWeight: nbType.bodyLg.fontWeight,
  },
  value: {
    fontSize: nbType.body.fontSize,
    fontWeight: nbType.h1.fontWeight,
    color: nbColors.black,
  },
  divider: {
    height: 1,
    backgroundColor: nbColors.gray200,
    marginVertical: nbSpacing.xs,
  },
  empty: {
    fontSize: nbType.body.fontSize,
    color: nbColors.gray500,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: nbSpacing.md,
  },
});
