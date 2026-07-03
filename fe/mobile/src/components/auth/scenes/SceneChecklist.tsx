/**
 * SceneChecklist — WL-3 ("Tugas terstruktur") carousel illustration.
 * A slightly-tilted patrol checklist card with two done items, two pending, and
 * a 2/4 progress bar. Mirrors design/project/hifi-mobile.html · WL-3.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { nbColors, nbBorders, nbRadius, nbShadows, nbSpacing } from '../../../constants/nbTokens';
import { NBText } from '../../nb';

function ChecklistRow({ label, done, emphasis }: { label: string; done: boolean; emphasis?: boolean }): React.JSX.Element {
  return (
    <View style={styles.row}>
      <View style={[styles.checkbox, done && styles.checkboxDone]}>
        {done ? <Text style={styles.check}>✓</Text> : null}
      </View>
      <NBText
        variant="body-sm"
        color={done ? 'gray500' : emphasis ? 'black' : 'gray600'}
        style={done ? styles.labelDone : undefined}
      >
        {label}
      </NBText>
    </View>
  );
}

export function SceneChecklist(): React.JSX.Element {
  const { t } = useTranslation();

  const ROWS: { label: string; done: boolean; emphasis?: boolean }[] = [
    { label: t('admin:checklist.mainDoorPatrol'), done: true },
    { label: t('admin:checklist.checkLightsAndCctv'), done: true },
    { label: t('admin:checklist.areaPhoto'), done: false, emphasis: true },
    { label: t('admin:checklist.lockPostEndShift'), done: false },
  ];

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <NBText variant="mono-sm" color="gray500" uppercase style={styles.header}>
          Checklist Patroli · Pos 04
        </NBText>
        <View style={styles.list}>
          {ROWS.map((r) => (
            <ChecklistRow key={r.label} {...r} />
          ))}
        </View>
        <View style={styles.track}>
          <View style={styles.fill} />
        </View>
        <View style={styles.footerRow}>
          <NBText variant="mono-sm" color="gray600">
            PROGRESS
          </NBText>
          <NBText variant="mono-sm" color="black">
            2 / 4
          </NBText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', padding: nbSpacing.lg },
  card: {
    width: '100%',
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.md,
    padding: nbSpacing.md,
    transform: [{ rotate: '-1.5deg' }],
    ...nbShadows.md,
  },
  header: { letterSpacing: 0.6, marginBottom: nbSpacing.sm },
  list: { gap: nbSpacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: nbSpacing.sm },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.sm,
    backgroundColor: nbColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: nbColors.success },
  check: { fontSize: 11, fontWeight: '800', color: nbColors.black, lineHeight: 13 },
  labelDone: { textDecorationLine: 'line-through' },
  track: {
    height: 6,
    backgroundColor: nbColors.gray100,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: nbSpacing.md,
  },
  fill: { width: '50%', height: 6, backgroundColor: nbColors.success },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: nbSpacing.xs },
});

export default SceneChecklist;
