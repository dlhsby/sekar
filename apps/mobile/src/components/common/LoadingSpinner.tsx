import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, ViewStyle } from 'react-native';
import { nbColors, nbSpacing, nbType } from '../../constants/nbTokens';

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
  color = nbColors.primary,
  style,
  fullScreen = false,
  message,
}: LoadingSpinnerProps): React.ReactElement {
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
    backgroundColor: nbColors.white,
  },
  message: {
    marginTop: nbSpacing.md,
    fontSize: nbType.bodySm.fontSize,
    color: nbColors.gray600,
  },
});

export default LoadingSpinner;
