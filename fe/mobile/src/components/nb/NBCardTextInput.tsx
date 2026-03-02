/**
 * NBCardTextInput
 * Card-wrapped multiline text input for description/reason fields.
 * Consistent styling across create and detail screens.
 */

import React, { memo } from 'react';
import { Text, StyleSheet, type ViewStyle } from 'react-native';
import { NBCard, NBCardHeader, NBCardContent } from './NBCard';
import { NBTextInput } from './NBTextInput';
import { nbColors, nbSpacing, nbTypography } from '../../constants/nbTokens';

export interface NBCardTextInputProps {
  /** Card header title — can include emoji prefix (e.g. "📝 DESKRIPSI") */
  title: string;
  /** Shows a red asterisk (*) after the title */
  required?: boolean;
  /** Optional subtitle below the title */
  subtitle?: string;
  /** Current text value */
  value: string;
  /** Called when text changes */
  onChangeText: (text: string) => void;
  /** Placeholder text inside the input */
  placeholder?: string;
  /** Max character count — enables a "N/max karakter" counter */
  maxLength?: number;
  /** Number of visible lines (default: 4) */
  numberOfLines?: number;
  /** Validation error message */
  error?: string;
  /** Outer card style override */
  style?: ViewStyle;
  /** Disable the input */
  disabled?: boolean;
  /** testID passed to the underlying TextInput */
  testID?: string;
}

export const NBCardTextInput = memo(function NBCardTextInput({
  title,
  required = false,
  subtitle,
  value,
  onChangeText,
  placeholder,
  maxLength,
  numberOfLines = 4,
  error,
  style,
  disabled = false,
  testID,
}: NBCardTextInputProps): React.JSX.Element {
  const helperText = maxLength ? `${value.length}/${maxLength} karakter` : undefined;

  return (
    <NBCard style={style}>
      <NBCardHeader>
        <Text style={styles.title}>
          {title}
          {required && <Text style={styles.asterisk}> *</Text>}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </NBCardHeader>
      <NBCardContent>
        <NBTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={nbColors.gray['400']}
          multiline
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          helperText={helperText}
          error={error}
          textAlignVertical="top"
          inputStyle={styles.input}
          editable={!disabled}
          testID={testID}
        />
      </NBCardContent>
    </NBCard>
  );
});

const styles = StyleSheet.create({
  title: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.black,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  asterisk: {
    color: nbColors.danger,
    fontWeight: nbTypography.fontWeight.bold,
    textTransform: 'none',
  },
  subtitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray['600'],
    marginTop: nbSpacing.xs,
  },
  input: {
    minHeight: 100,
  },
});
