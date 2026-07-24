/**
 * HomeSectionDivider — mono-uppercase section label + hairline rule, with an
 * optional trailing slot (e.g. a "3 tersisa" StatusPill). Hi-fi `.div-h`.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NBText } from '../nb/NBText';
import { nbColors, nbSpacing } from '../../constants/nbTokens';

interface HomeSectionDividerProps {
  label: string;
  trailing?: React.ReactNode;
  /**
   * First divider on the screen — drops the top margin so the page doesn't open
   * with a doubled gap (screen padding + divider margin). Every home screen owns
   * the uniform inter-section rhythm through this component's margins alone, so
   * section cards must NOT add their own `marginBottom` (that stacking is exactly
   * what made the gaps uneven).
   */
  first?: boolean;
}

export function HomeSectionDivider({
  label,
  trailing,
  first = false,
}: HomeSectionDividerProps): React.JSX.Element {
  return (
    <View style={[styles.row, first && styles.rowFirst]}>
      <NBText variant="mono-sm" color="gray600" uppercase style={styles.label}>
        {label}
      </NBText>
      <View style={styles.rule} />
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
    marginTop: nbSpacing.md,
    marginBottom: nbSpacing.sm,
  },
  rowFirst: {
    marginTop: 0,
  },
  label: {
    letterSpacing: 0.6,
  },
  rule: {
    flex: 1,
    height: 2,
    backgroundColor: nbColors.gray300,
  },
});

export default HomeSectionDivider;
