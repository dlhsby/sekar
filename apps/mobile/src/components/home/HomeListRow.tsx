/**
 * HomeListRow — list item (hi-fi `.lrow`): optional status pill + right-aligned
 * meta on top, a title, and an optional secondary meta line, on a white card
 * with a hard-edge border. Used by HOME-1 tasks, HOME-2 alerts, HOME-3 approvals.
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { NBText } from '../nb/NBText';
import { nbColors, nbBorders, nbRadius, nbSpacing, nbShadows } from '../../constants/nbTokens';

interface HomeListRowProps {
  pill?: React.ReactNode;
  title: string;
  meta?: string;
  subMeta?: string;
  onPress?: () => void;
  testID?: string;
}

export function HomeListRow({
  pill,
  title,
  meta,
  subMeta,
  onPress,
  testID,
}: HomeListRowProps): React.JSX.Element {
  const body = (
    <>
      {(pill || meta) ? (
        <View style={styles.top}>
          {pill ?? <View />}
          {meta ? (
            <NBText variant="mono-sm" color="gray500" numberOfLines={1} style={styles.meta}>
              {meta}
            </NBText>
          ) : null}
        </View>
      ) : null}
      <NBText variant="body-sm" color="black" numberOfLines={2} style={styles.title}>
        {title}
      </NBText>
      {subMeta ? (
        <NBText variant="mono-sm" color="gray500" numberOfLines={1} style={styles.subMeta}>
          {subMeta}
        </NBText>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        testID={testID}
      >
        {body}
      </TouchableOpacity>
    );
  }
  return (
    <View style={styles.row} testID={testID}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    ...nbShadows.xs,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: nbSpacing.sm,
    marginBottom: 4,
  },
  meta: {
    fontSize: 10,
  },
  title: {
    fontWeight: '600',
  },
  subMeta: {
    fontSize: 10,
    marginTop: 2,
  },
});

export default HomeListRow;
