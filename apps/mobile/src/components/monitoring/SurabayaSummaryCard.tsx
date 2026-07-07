/**
 * SurabayaSummaryCard — the top-level (city-wide) summary shown before drilling
 * into rayons. Displays today's attendance trio for all of Surabaya
 * (Terjadwal / Hadir / Belum Hadir) and drills into the 7 rayons on tap,
 * mirroring the Surabaya map node and the web card.
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { nbColors, nbSpacing, nbBorders, nbRadius, nbShadows } from '../../constants/nbTokens';
import { NBText } from '../nb/NBText';
import type { AggregateRosterCounts } from '../../types/models.types';

interface SurabayaSummaryCardProps {
  roster: AggregateRosterCounts;
  onDrill: () => void;
}

export function SurabayaSummaryCard({
  roster,
  onDrill,
}: SurabayaSummaryCardProps): React.JSX.Element {
  const { t } = useTranslation();

  const metrics: { key: string; label: string; value: number; color: string }[] = [
    {
      key: 'scheduled',
      label: t('monitoring:aggregate.scheduledLabel'),
      value: roster.scheduled,
      color: nbColors.black,
    },
    {
      key: 'clocked_in',
      label: t('monitoring:aggregate.clockedInLabel'),
      value: roster.clocked_in,
      color: nbColors.statusActive,
    },
    {
      key: 'not_clocked_in',
      label: t('monitoring:aggregate.notClockedInLabel'),
      value: roster.not_clocked_in,
      color: nbColors.dangerDark,
    },
  ];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onDrill}
      accessibilityRole="button"
      accessibilityLabel={t('monitoring:surabaya.tapHint')}
    >
      <View style={styles.body}>
        <NBText variant="h3" style={styles.title}>
          {t('monitoring:surabaya.title')}
        </NBText>
        <View style={styles.metricsRow}>
          {metrics.map(m => (
            <View key={m.key} style={styles.metric}>
              <NBText variant="h3" style={[styles.value, { color: m.color }]}>
                {String(m.value)}
              </NBText>
              <NBText variant="caption" color="gray600">
                {m.label}
              </NBText>
            </View>
          ))}
        </View>
        <NBText variant="caption" color="gray500" style={styles.hint}>
          {t('monitoring:surabaya.tapHint')}
        </NBText>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={nbColors.gray400} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.md,
    ...nbShadows.md,
  },
  body: {
    flex: 1,
  },
  title: {
    color: nbColors.black,
  },
  metricsRow: {
    flexDirection: 'row',
    marginTop: nbSpacing.xs,
    gap: nbSpacing.lg,
  },
  metric: {
    alignItems: 'flex-start',
  },
  value: {
    fontWeight: '800',
  },
  hint: {
    marginTop: 2,
  },
});
