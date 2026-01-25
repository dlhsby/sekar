import React, { useState } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../constants/theme';

interface CustomTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  success?: boolean; // Show green border for validated fields
  successMessage?: string; // Optional success message
  containerStyle?: ViewStyle;
  accessibilityHint?: string;
}

/**
 * Styled text input component with label, error, and success states
 */
export function TextInput({
  label,
  error,
  success = false,
  successMessage,
  containerStyle,
  style,
  accessibilityHint,
  onFocus,
  onBlur,
  ...props
}: CustomTextInputProps): JSX.Element {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  // Determine input state for styling
  const hasError = !!error;
  const hasSuccess = success && !hasError;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          style={styles.label}
          accessibilityRole="text"
        >
          {label}
        </Text>
      )}
      <View style={styles.inputWrapper}>
        <RNTextInput
          style={[
            styles.input,
            isFocused && styles.inputFocused,
            hasError && styles.inputError,
            hasSuccess && styles.inputSuccess,
            style,
          ]}
          placeholderTextColor={theme.colors.textSecondary}
          accessibilityLabel={label || props.placeholder}
          accessibilityHint={accessibilityHint}
          accessibilityState={{
            disabled: props.editable === false,
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {/* Success icon */}
        {hasSuccess && (
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="check-circle"
              size={20}
              color={theme.colors.success}
            />
          </View>
        )}
        {/* Error icon */}
        {hasError && (
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={20}
              color={theme.colors.error}
            />
          </View>
        )}
      </View>
      {/* Error message */}
      {hasError && (
        <Text
          style={styles.errorText}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      )}
      {/* Success message */}
      {hasSuccess && successMessage && (
        <Text
          style={styles.successText}
          accessibilityRole="text"
        >
          {successMessage}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    height: 56, // Increased from 50 to 56dp for better touch target
    borderWidth: 2, // Consistent 2px border to prevent layout shift
    borderColor: theme.colors.border, // Always show border
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingRight: 44, // Space for icon
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.white,
  },
  inputFocused: {
    borderColor: theme.colors.primary,
    // No padding compensation needed - border width is consistent
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  inputSuccess: {
    borderColor: theme.colors.success,
  },
  iconContainer: {
    position: 'absolute',
    right: theme.spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  errorText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
  successText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.success,
    marginTop: theme.spacing.xs,
  },
});

export default TextInput;
