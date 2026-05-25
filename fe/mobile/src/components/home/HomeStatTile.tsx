/**
 * HomeStatTile — KPI tile (hi-fi `.stat-tile`): mono label, big value, optional
 * detail line, on a tone-tinted card with a hard-edge border + shadow. Used by
 * HOME-1 summary, HOME-2 KPI grid, HOME-3 disposition breakdown.
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { NBText } from '../nb/NBText';
import { nbColors, nbBorders, nbRadius, nbSpacing, nbShadows } from '../../constants/nbTokens';

export type StatTileVariant = 'neutral' | 'ok' | 'warn' | 'bad' | 'yellow' | 'info';

const VARIANT_BG: Record<StatTileVariant, string> = {
  neutral: nbColors.white,
  ok: nbColors.statusActiveBg,
  warn: nbColors.statusIdleBg,
  bad: nbColors.statusMissingBg,
  yellow: nbColors.bgAccentYellow,
  info: nbColors.bgAccentMint,
};

interface HomeStatTileProps {
  label: string;
  value: string | number;
  detail?: string;
  variant?: StatTileVariant;
  onPress?: () => void;
  testID?: string;
}

export function HomeStatTile({
  label,
  value,
  detail,
  variant = 'neutral',
  onPress,
  testID,
}: HomeStatTileProps): React.JSX.Element {
  const body = (
    <>
      <NBText variant="mono-sm" color="gray600" uppercase numberOfLines={1} style={styles.label}>
        {label}
      </NBText>
      <NBText variant="h2" color="black" numberOfLines={1} style={styles.value}>
        {String(value)}
      </NBText>
      {detail ? (
        <NBText variant="mono-sm" color="gray500" numberOfLines={1} style={styles.detail}>
          {detail}
        </NBText>
      ) : null}
    </>
  );

  const tileStyle = [styles.tile, { backgroundColor: VARIANT_BG[variant] }];

  if (onPress) {
    return (
      <TouchableOpacity
        style={tileStyle}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}${detail ? `, ${detail}` : ''}`}
        testID={testID}
      >
        {body}
      </TouchableOpacity>
    );
  }
  return (
    <View style={tileStyle} testID={testID}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.sm,
    ...nbShadows.xs,
  },
  label: {
    fontSize: 9.5,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  value: {
    marginBottom: 1,
  },
  detail: {
    fontSize: 10,
    lineHeight: 13,
  },
});

export default HomeStatTile;
