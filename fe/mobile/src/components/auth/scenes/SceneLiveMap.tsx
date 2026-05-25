/**
 * SceneLiveMap — WL-2 ("Pantau real-time") carousel illustration.
 * A mini monitoring map: faint grid, five status pins, and two floating stat
 * chips (Aktif / Off-area). Mirrors design/project/hifi-mobile.html · WL-2.
 */

import React from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { nbColors, nbBorders, nbRadius, nbShadows, nbSpacing } from '../../../constants/nbTokens';
import { NBText } from '../../nb';

const PINS: { top: DimensionValue; left: DimensionValue; color: string }[] = [
  { top: '20%', left: '28%', color: nbColors.statusActive },
  { top: '40%', left: '60%', color: nbColors.primary },
  { top: '60%', left: '22%', color: nbColors.statusMissing },
  { top: '72%', left: '68%', color: nbColors.statusActive },
  { top: '16%', left: '74%', color: nbColors.primary },
];

function Pin({ top, left, color }: { top: DimensionValue; left: DimensionValue; color: string }): React.JSX.Element {
  return (
    <View style={[styles.pin, { top, left, backgroundColor: color }]}>
      <View style={styles.pinDot} />
    </View>
  );
}

function StatChip({
  label,
  value,
  tone,
  style,
}: {
  label: string;
  value: string;
  tone: 'ok' | 'bad';
  style: StyleProp<ViewStyle>;
}): React.JSX.Element {
  return (
    <View style={[styles.chip, style]}>
      <NBText variant="mono-sm" color="gray600" uppercase style={styles.chipLabel}>
        {label}
      </NBText>
      <NBText variant="h3" color={tone === 'ok' ? 'statusActive' : 'statusMissing'}>
        {value}
      </NBText>
    </View>
  );
}

export function SceneLiveMap(): React.JSX.Element {
  return (
    <View style={styles.root}>
      {/* Faint map grid */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        {[20, 40, 60, 80].map((p) => (
          <Line key={`h${p}`} x1="0" y1={`${p}%`} x2="100%" y2={`${p}%`} stroke={nbColors.gray300} strokeWidth={1} opacity={0.4} />
        ))}
        {[25, 50, 75].map((p) => (
          <Line key={`v${p}`} x1={`${p}%`} y1="0" x2={`${p}%`} y2="100%" stroke={nbColors.gray300} strokeWidth={1} opacity={0.4} />
        ))}
      </Svg>

      {PINS.map((pin, i) => (
        <Pin key={i} {...pin} />
      ))}

      <StatChip label="Aktif" value="14" tone="ok" style={styles.chipTopLeft} />
      <StatChip label="Off-area" value="2" tone="bad" style={styles.chipBottomRight} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', backgroundColor: nbColors.bgAccentMint },
  pin: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    borderBottomRightRadius: 11,
    borderBottomLeftRadius: 0,
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: nbColors.white,
  },
  chip: {
    position: 'absolute',
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: 11,
    ...nbShadows.sm,
  },
  chipLabel: { letterSpacing: 0.5 },
  chipTopLeft: { top: nbSpacing.md, left: nbSpacing.md },
  chipBottomRight: { bottom: nbSpacing.md, right: nbSpacing.md },
});

export default SceneLiveMap;
