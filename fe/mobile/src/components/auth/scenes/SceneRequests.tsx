/**
 * SceneRequests — WL-4 ("Permohonan kecamatan") carousel illustration.
 * Two stacked, tilted permohonan cards (one approved, one in-progress) to convey
 * the request queue. Mirrors design/project/hifi-mobile.html · WL-4.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { nbColors, nbBorders, nbRadius, nbShadows, nbSpacing } from '../../../constants/nbTokens';
import { NBText, type NBTextColor } from '../../nb';

function Pill({ label, tone }: { label: string; tone: 'granted' | 'pending' }): React.JSX.Element {
  const bg = tone === 'granted' ? nbColors.statusActiveBg : nbColors.gray200;
  const fg: NBTextColor = tone === 'granted' ? 'statusActive' : 'gray600';
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <NBText variant="mono-sm" color={fg}>
        {label}
      </NBText>
    </View>
  );
}

export function SceneRequests(): React.JSX.Element {
  return (
    <View style={styles.root}>
      <View style={styles.cardTop}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderText}>
            <NBText variant="mono-sm" color="gray500">
              PERMOHONAN #1042
            </NBText>
            <NBText variant="body-sm" color="black" style={styles.cardTitle}>
              Pohon tumbang Jl. Anggrek
            </NBText>
          </View>
          <Pill label="DISETUJUI" tone="granted" />
        </View>
        <View style={styles.metaRow}>
          <NBText variant="mono-sm" color="gray600">
            📍 Bekasi 03
          </NBText>
          <NBText variant="mono-sm" color="gray600">
            •
          </NBText>
          <NBText variant="mono-sm" color="gray600">
            2 jam lalu
          </NBText>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <NBText variant="mono-sm" color="gray500">
          PERMOHONAN #1041
        </NBText>
        <NBText variant="body-sm" color="black" style={styles.cardTitle}>
          Tebang pohon kering
        </NBText>
        <View style={styles.pillWrap}>
          <Pill label="DIPROSES" tone="pending" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', padding: nbSpacing.md },
  cardTop: {
    width: '88%',
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    padding: nbSpacing.md,
    transform: [{ rotate: '2deg' }],
    marginBottom: nbSpacing.md,
    ...nbShadows.md,
  },
  cardBottom: {
    width: '78%',
    alignSelf: 'flex-start',
    marginLeft: nbSpacing.lg,
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    padding: nbSpacing.sm,
    transform: [{ rotate: '-3deg' }],
    ...nbShadows.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: nbSpacing.sm },
  cardHeaderText: { flex: 1 },
  cardTitle: { marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: nbSpacing.sm, marginTop: nbSpacing.sm },
  pillWrap: { flexDirection: 'row', marginTop: nbSpacing.xs },
  pill: {
    borderWidth: 1.5,
    borderColor: nbColors.black,
    borderRadius: nbRadius.full,
    paddingVertical: 3,
    paddingHorizontal: nbSpacing.sm,
    alignSelf: 'flex-start',
  },
});

export default SceneRequests;
