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
}

export function HomeSectionDivider({ label, trailing }: HomeSectionDividerProps): React.JSX.Element {
  return (
    <View style={styles.row}>
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
