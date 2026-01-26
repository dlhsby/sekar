/**
 * NBTextInput - Neo Brutalism Text Input Component
 *
 * Text input with bold borders and hard-edge shadows.
 * Includes label, error, and success states.
 *
 * @see specs/ui-ux/neo-brutalism.md
 */

import React, { useState, useCallback, forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from 'react-native';
import {
  nbColors,
  nbShadows,
  nbSpacing,
  nbBorders,
  nbTypography,
  nbTouchTarget,
} from '../../constants/nbTokens';

export interface NBTextInputProps extends Omit<TextInputProps, 'style'> {
  /** Input label */
  label?: string;
  /** Error message */
  error?: string;
  /** Success state */
  success?: boolean;
  /** Helper text */
  helperText?: string;
  /** Custom container style */
  containerStyle?: ViewStyle;
  /** Custom input style */
  inputStyle?: TextStyle;
  /** Custom label style */
  labelStyle?: TextStyle;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Neo Brutalism styled text input with label and validation states
 *
 * @example
 * <NBTextInput
 *   label="Email"
 *   placeholder="Enter your email"
 *   value={email}
 *   onChangeText={setEmail}
 *   error={emailError}
 * />
 */
export const NBTextInput = forwardRef<TextInput, NBTextInputProps>(
  (
    {
      label,
      error,
      success,
      helperText,
      containerStyle,
      inputStyle,
      labelStyle,
      testID,
      onFocus,
      onBlur,
      editable = true,
      ...textInputProps
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = useCallback(
      (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        setIsFocused(true);
        onFocus?.(e);
      },
      [onFocus],
    );

    const handleBlur = useCallback(
      (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        setIsFocused(false);
        onBlur?.(e);
      },
      [onBlur],
    );

    // Determine border color based on state
    const getBorderColor = () => {
      if (error) {return nbColors.danger;}
      if (success) {return nbColors.success;}
      if (isFocused) {return nbColors.primary;}
      return nbColors.black;
    };

    const isDisabled = editable === false;

    return (
      <View style={[styles.container, containerStyle]} testID={testID}>
        {label && (
          <Text
            style={[styles.label, labelStyle]}
            testID={testID ? `${testID}-label` : undefined}
          >
            {label}
          </Text>
        )}
        <TextInput
          ref={ref}
          {...textInputProps}
          editable={editable}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={nbColors.gray[400]}
          testID={testID ? `${testID}-input` : undefined}
          style={[
            styles.input,
            !isDisabled && nbShadows.sm,
            { borderColor: getBorderColor() },
            isDisabled && styles.disabled,
            inputStyle,
          ]}
        />
        {error && (
          <Text
            style={styles.error}
            testID={testID ? `${testID}-error` : undefined}
          >
            {error}
          </Text>
        )}
        {!error && helperText && (
          <Text
            style={styles.helperText}
            testID={testID ? `${testID}-helper` : undefined}
          >
            {helperText}
          </Text>
        )}
      </View>
    );
  },
);

NBTextInput.displayName = 'NBTextInput';

const styles = StyleSheet.create({
  container: {
    marginBottom: nbSpacing.md,
  },
  label: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
    marginBottom: nbSpacing.xs,
  },
  input: {
    minHeight: nbTouchTarget.minHeight,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.default,
    borderColor: nbColors.black,
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.black,
  },
  error: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.danger,
    marginTop: nbSpacing.xs,
  },
  helperText: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray[600],
    marginTop: nbSpacing.xs,
  },
  disabled: {
    backgroundColor: nbColors.gray[100],
    ...nbShadows.none,
  },
});

export default NBTextInput;
