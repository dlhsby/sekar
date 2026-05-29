/**
 * StatusPill — compact mono-uppercase status chip (hi-fi `.pill`).
 *
 * NBBadge can't express the status-bg + full-radius + mono-uppercase pill the
 * Home dashboards need, so this thin wrapper maps a semantic tone to the
 * 5-status token palette. Used by HomeListRow + the per-role hero cards.
 */
import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { NBText, type NBTextColor } from '../nb/NBText';
import { nbColors, nbBorders, nbRadius, nbSpacing } from '../../constants/nbTokens';

export type StatusTone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral';

const TONE: Record<StatusTone, { bg: string; border: string; fg: NBTextColor }> = {
  ok: { bg: nbColors.statusActiveBg, border: nbColors.statusActive, fg: 'statusActive' },
  warn: { bg: nbColors.statusIdleBg, border: nbColors.statusIdle, fg: 'statusIdle' },
  bad: { bg: nbColors.statusMissingBg, border: nbColors.statusMissing, fg: 'statusMissing' },
  info: { bg: nbColors.bgAccentMint, border: nbColors.black, fg: 'black' },
  neutral: { bg: nbColors.gray200, border: nbColors.gray400, fg: 'gray700' },
};

interface StatusPillProps {
  tone?: StatusTone;
  label: string;
  /** Render a leading status dot (hi-fi `.pill .d`). */
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function StatusPill({ tone = 'neutral', label, dot = false, style, testID }: StatusPillProps): React.JSX.Element {
  const t = TONE[tone];
  return (
    <View
      style={[styles.pill, { backgroundColor: t.bg, borderColor: t.border }, style]}
      testID={testID}
    >
      {dot ? (
        <View
          style={[styles.dot, { backgroundColor: t.border }]}
          testID={testID ? `${testID}-dot` : undefined}
        />
      ) : null}
      <NBText variant="mono-sm" color={t.fg} uppercase style={styles.label}>
        {label}
      </NBText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: 2,
    borderWidth: nbBorders.widthThin,
    borderRadius: nbRadius.full,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  label: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.4,
  },
});

export default StatusPill;
