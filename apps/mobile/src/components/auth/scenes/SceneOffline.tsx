/**
 * SceneOffline — WL-5 ("Bekerja offline") carousel illustration.
 * On the navy panel: a faint diagonal stripe wash, a white icon box with a
 * wifi-off mark, and a "3 ITEM ANTRI" queue chip. Mirrors
 * specs/design-system/mockups/project/hifi-mobile.html · WL-5.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { nbColors, nbBorders, nbRadius, nbShadows, nbSpacing } from '../../../constants/nbTokens';
import { NBText } from '../../nb';

function WifiOff(): React.JSX.Element {
  return (
    <Svg width={44} height={44} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12.55a11 11 0 0 1 14.08 0" stroke={nbColors.black} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M1.42 9a16 16 0 0 1 21.16 0" stroke={nbColors.black} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M8.53 16.11a6 6 0 0 1 6.95 0" stroke={nbColors.black} strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx={12} cy={20} r={1} fill={nbColors.black} />
      <Line x1={2} y1={2} x2={22} y2={22} stroke={nbColors.danger} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

export function SceneOffline(): React.JSX.Element {
  return (
    <View style={styles.root}>
      {/* faint diagonal stripe wash */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        {[-40, 0, 40, 80, 120, 160, 200].map((x) => (
          <Line key={x} x1={x} y1="0" x2={x + 220} y2="100%" stroke={nbColors.white} strokeWidth={6} opacity={0.04} />
        ))}
      </Svg>

      <View style={styles.iconBox}>
        <WifiOff />
      </View>
      <View style={styles.chip}>
        <View style={styles.chipDot} />
        <NBText variant="mono-sm" color="black">
          3 ITEM ANTRI
        </NBText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', padding: nbSpacing.lg },
  iconBox: {
    width: 84,
    height: 84,
    backgroundColor: nbColors.white,
    borderWidth: 3,
    borderColor: nbColors.black,
    borderRadius: nbRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: nbSpacing.md,
    ...nbShadows.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    paddingVertical: 5,
    paddingHorizontal: 10,
    ...nbShadows.xs,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: nbColors.warning },
});

export default SceneOffline;
