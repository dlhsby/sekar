import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { nbSpacing } from '../../constants/nbTokens';

const NB_BUTTON_LG_HEIGHT = 56;

/**
 * Total vertical space the FAB bar occupies from the screen bottom.
 * Use this as `paddingBottom` on any list/scroll view that sits behind a FAB.
 *
 * = bottom edge gap (sm) + button lg height + gap between list and button (sm)
 */
export const NB_FAB_BAR_HEIGHT =
  nbSpacing.sm + NB_BUTTON_LG_HEIGHT + nbSpacing.sm;

interface NBFabBarProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function NBFabBar({ children, style }: NBFabBarProps): React.JSX.Element {
  return (
    <View style={[styles.container, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: nbSpacing.sm,
    left: nbSpacing.md,
    right: nbSpacing.md,
    paddingTop: nbSpacing.sm,
  },
});
