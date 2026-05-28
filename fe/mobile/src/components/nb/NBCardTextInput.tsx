import React, { memo } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { NBCard, NBCardHeader, NBCardContent } from './NBCard';
import { NBText } from './NBText';
import { NBTextInput } from './NBTextInput';
import { nbColors, nbSpacing } from '../../constants/nbTokens';

export interface NBCardTextInputProps {
  title: string;
  required?: boolean;
  subtitle?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  numberOfLines?: number;
  error?: string;
  style?: ViewStyle;
  disabled?: boolean;
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
        <NBText variant="mono-sm" color="gray700" uppercase style={styles.title}>
          {title}
          {required && (
            <NBText variant="mono-sm" color="danger" style={styles.asterisk}> *</NBText>
          )}
        </NBText>
        {subtitle ? (
          <NBText variant="body-sm" color="gray600" style={styles.subtitle}>{subtitle}</NBText>
        ) : null}
      </NBCardHeader>
      <NBCardContent>
        <NBTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={nbColors.gray400}
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
    letterSpacing: 0.5,
  },
  asterisk: {
    textTransform: 'none',
  },
  subtitle: {
    marginTop: nbSpacing.xs,
  },
  input: {
    minHeight: 100,
  },
});
