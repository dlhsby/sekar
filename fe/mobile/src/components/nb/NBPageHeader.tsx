import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { NBText } from './NBText';
import { nbSpacing } from '../../constants/nbTokens';

interface NBPageHeaderProps {
  title: string;
  style?: StyleProp<ViewStyle>;
}

export function NBPageHeader({ title, style }: NBPageHeaderProps): React.JSX.Element {
  return (
    <View style={[styles.container, style]}>
      <NBText variant="h3" style={styles.title}>{title}</NBText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: nbSpacing.md,
    paddingTop: nbSpacing.sm,
    paddingBottom: nbSpacing.xs,
  },
  title: {
    marginBottom: 0,
  },
});
