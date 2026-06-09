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
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import {
  nbColors,
  nbShadows,
  nbSpacing,
  nbBorders,
  nbRadius,
  nbType,
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
  containerStyle?: StyleProp<ViewStyle>;
  /** Custom input style */
  inputStyle?: StyleProp<TextStyle>;
  /** Custom label style */
  labelStyle?: StyleProp<TextStyle>;
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
      onFocus: onFocusProp,
      onBlur: onBlurProp,
      editable = true,
      ...textInputProps
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = useCallback(
      (e: any) => {
        setIsFocused(true);
        onFocusProp?.(e);
      },
      [onFocusProp],
    );

    const handleBlur = useCallback(
      (e: any) => {
        setIsFocused(false);
        onBlurProp?.(e);
      },
      [onBlurProp],
    );

    // Determine border color based on state
    const getBorderColor = () => {
      if (error) {return nbColors.danger;}
      if (success) {return nbColors.success;}
      if (isFocused) {return nbColors.primary;} // Bright grass green for visibility
      return nbColors.black;
    };

    // Determine border width based on state (thicker when focused)
    const getBorderWidth = () => {
      if (isFocused) {return nbBorders.widthThick;} // 4px when focused
      return nbBorders.widthBase; // 3px default
    };

    // Custom shadow for focused state (colored shadow for NB impact)
    const getFocusedShadow = () => {
      if (isFocused && !isDisabled) {
        return {
          shadowColor: nbColors.primary, // Bright green shadow
          shadowOffset: { width: 6, height: 6 },
          shadowOpacity: 1,
          shadowRadius: 0,
          elevation: 6,
        };
      }
      return {};
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
          {...(textInputProps as Omit<typeof textInputProps, 'onFocus' | 'onBlur'>)}
          editable={editable}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={nbColors.gray400}
          testID={testID ? `${testID}-input` : undefined}
          accessibilityLabel={
            textInputProps.accessibilityLabel ||
            label ||
            textInputProps.placeholder
          }
          accessibilityHint={
            textInputProps.accessibilityHint ||
            (!error ? helperText : undefined)
          }
          accessibilityState={{
            disabled: isDisabled,
            ...textInputProps.accessibilityState,
          }}
          style={[
            styles.input,
            !isDisabled && !isFocused && nbShadows.sm, // Default shadow when not focused
            getFocusedShadow(), // Colored shadow when focused
            {
              borderColor: getBorderColor(),
              borderWidth: getBorderWidth(),
            },
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
    fontSize: nbType.bodySm.fontSize,
    fontWeight: nbType.h2.fontWeight,
    color: nbColors.black,
    marginBottom: nbSpacing.xs,
  },
  input: {
    minHeight: nbTouchTarget.minHeight,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    backgroundColor: nbColors.white,
    // borderWidth and borderColor now dynamic (see getBorderWidth/getBorderColor)
    borderRadius: nbRadius.base, // 2px - softened NB
    fontSize: nbType.body.fontSize,
    fontWeight: nbType.body.fontWeight,
    color: nbColors.black,
  },
  error: {
    fontSize: nbType.caption.fontSize,
    fontWeight: nbType.bodyLg.fontWeight,
    color: nbColors.danger,
    marginTop: nbSpacing.xs,
  },
  helperText: {
    fontSize: nbType.caption.fontSize,
    fontWeight: nbType.body.fontWeight,
    color: nbColors.gray600,
    marginTop: nbSpacing.xs,
  },
  disabled: {
    backgroundColor: nbColors.gray100,
    ...nbShadows.none,
  },
});

export default NBTextInput;
