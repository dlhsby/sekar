import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../constants/theme';

interface CardProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}

/**
 * Generic card component with shadow and border radius
 */
export function Card({ children, style, testID }: CardProps): JSX.Element {
  return <View style={[styles.card, style]} testID={testID}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.md,
  },
});

export default Card;
