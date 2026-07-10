/**
 * PaginationDots — carousel/onboarding progress indicator.
 *
 * - `dots` (carousel footer): circle dots; the active one elongates into a sage bar.
 * - `bars`  (carousel header / onboarding): equal-width thin segments, active = sage.
 *
 * Mirrors the `.dots` / `.bars` primitives in specs/design-system/mockups/project/hifi-mobile.html.
 */

import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { nbColors, nbBorders } from '../../constants/nbTokens';

export interface PaginationDotsProps {
  total: number;
  index: number;
  variant?: 'dots' | 'bars';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function PaginationDots({
  total,
  index,
  variant = 'dots',
  style,
  testID,
}: PaginationDotsProps): React.JSX.Element {
  const isBars = variant === 'bars';
  return (
    <View
      style={[isBars ? styles.barsRow : styles.dotsRow, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: index + 1 }}
      testID={testID}
    >
      {Array.from({ length: total }).map((_, i) => {
        const active = i === index;
        if (isBars) {
          return <View key={i} style={[styles.bar, active && styles.barActive]} />;
        }
        return <View key={i} style={[styles.dot, active ? styles.dotActive : styles.dotIdle]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: 8, borderWidth: nbBorders.widthThin, borderColor: nbColors.black },
  dotIdle: { width: 8, borderRadius: 4, backgroundColor: nbColors.gray300 },
  dotActive: { width: 26, borderRadius: 5, backgroundColor: nbColors.primary },
  barsRow: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: nbColors.gray200 },
  barActive: { backgroundColor: nbColors.primary },
});

export default PaginationDots;
