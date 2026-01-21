import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../constants/theme';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  style?: ViewStyle;
  fullScreen?: boolean;
  message?: string;
}

/**
 * Loading spinner component with customizable size and color
 */
export function LoadingSpinner({
  size = 'large',
  color = theme.colors.primary,
  style,
  fullScreen = false,
  message,
}: LoadingSpinnerProps): JSX.Element {
  if (fullScreen) {
    return (
      <View style={styles.fullScreenContainer} testID="loading-container">
        <ActivityIndicator size={size} color={color} testID="loading-spinner" />
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} testID="loading-spinner" />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
  },
  message: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
});

export default LoadingSpinner;
