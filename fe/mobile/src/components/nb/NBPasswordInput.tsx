/**
 * NBPasswordInput - Neo Brutalism Password Input Component
 *
 * Password input with visibility toggle following NB design system.
 * Wraps NBTextInput with password toggle functionality.
 *
 * @see specs/ui-ux/neo-brutalism.md
 */

import React, { useState, useCallback, forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  StyleProp,
  ViewStyle,
  TextStyle,
  NativeSyntheticEvent,
  TextInputFocusEventData,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbShadows,
  nbSpacing,
  nbBorders,
  nbRadius,
  nbType,
  nbTouchTarget,
} from '../../constants/nbTokens';

export interface NBPasswordInputProps extends Omit<TextInputProps, 'style' | 'secureTextEntry'> {
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
  /** Show password label (accessibility) */
  showPasswordLabel?: string;
  /** Hide password label (accessibility) */
  hidePasswordLabel?: string;
}

/**
 * Neo Brutalism styled password input with visibility toggle
 *
 * @example
 * <NBPasswordInput
 *   label="Password"
 *   placeholder="Enter your password"
 *   value={password}
 *   onChangeText={setPassword}
 *   error={passwordError}
 * />
 */
export const NBPasswordInput = forwardRef<TextInput, NBPasswordInputProps>(
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
      showPasswordLabel = 'Tampilkan password',
      hidePasswordLabel = 'Sembunyikan password',
      ...textInputProps
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- event type compatibility
    const handleFocus = useCallback(
      (e: any) => {
        setIsFocused(true);
        onFocusProp?.(e);
      },
      [onFocusProp],
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- event type compatibility
    const handleBlur = useCallback(
      (e: any) => {
        setIsFocused(false);
        onBlurProp?.(e);
      },
      [onBlurProp],
    );

    const togglePasswordVisibility = useCallback(() => {
      setShowPassword(prev => !prev);
    }, []);

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
        <View
          style={[
            styles.inputWrapper,
            !isDisabled && !isFocused && nbShadows.sm, // Default shadow when not focused
            getFocusedShadow(), // Colored shadow when focused
            {
              borderColor: getBorderColor(),
              borderWidth: getBorderWidth(),
            },
            isDisabled && styles.disabled,
          ]}
        >
          <TextInput
            ref={ref}
            {...(textInputProps as Omit<typeof textInputProps, 'onFocus' | 'onBlur'>)}
            editable={editable}
            secureTextEntry={!showPassword}
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
            style={[styles.input, inputStyle]}
          />
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={togglePasswordVisibility}
            disabled={isDisabled}
            accessibilityLabel={showPassword ? hidePasswordLabel : showPasswordLabel}
            accessibilityRole="button"
            testID={testID ? `${testID}-toggle` : undefined}
          >
            <MaterialCommunityIcons
              name={showPassword ? 'eye-off' : 'eye'}
              size={24}
              color={isDisabled ? nbColors.gray400 : nbColors.gray600}
            />
          </TouchableOpacity>
        </View>
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

NBPasswordInput.displayName = 'NBPasswordInput';

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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: nbColors.white,
    // borderWidth and borderColor now dynamic (see getBorderWidth/getBorderColor)
    borderRadius: nbRadius.base, // 2px - softened NB
    minHeight: nbTouchTarget.minHeight,
  },
  input: {
    flex: 1,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    fontSize: nbType.body.fontSize,
    fontWeight: nbType.body.fontWeight,
    color: nbColors.black,
    minHeight: nbTouchTarget.minHeight,
  },
  toggleButton: {
    paddingHorizontal: nbSpacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: nbTouchTarget.minWidth,
    minHeight: nbTouchTarget.minHeight,
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

export default NBPasswordInput;
