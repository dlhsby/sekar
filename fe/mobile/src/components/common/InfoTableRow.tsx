/**
 * InfoTableRow — side-by-side label:value row (label left, value right).
 * The shared "table" standard for attendance/detail cards: a small, muted
 * caption label and a prominent body-size black value so the data reads first.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NBText } from '../nb/NBText';
import { nbSpacing } from '../../constants/nbTokens';

export interface InfoTableRowProps {
  label: string;
  /** String value, or a custom node (badge, coords + action, …) rendered right-aligned. */
  value: string | React.ReactNode;
  numberOfLines?: number;
  testID?: string;
}

export function InfoTableRow({
  label,
  value,
  numberOfLines,
  testID,
}: InfoTableRowProps): React.JSX.Element {
  return (
    <View style={styles.row} testID={testID}>
      <NBText variant="caption" color="gray600">{label}</NBText>
      {typeof value === 'string' ? (
        <NBText variant="body" color="black" numberOfLines={numberOfLines} style={styles.value}>
          {value}
        </NBText>
      ) : (
        <View style={styles.valueSlot}>{value}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: nbSpacing.sm,
  },
  value: { flexShrink: 1, textAlign: 'right' },
  valueSlot: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: nbSpacing.xs,
  },
});

export default InfoTableRow;
