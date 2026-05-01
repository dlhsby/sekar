import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbBorders,
  nbBorderRadius,
  nbSpacing,
  nbTypography,
  nbShadows,
} from '../../constants/nbTokens';

// ─── Props ────────────────────────────────────────────────────────────────────

interface MonitoringSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  placeholder?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const MonitoringSearchBar = React.memo(function MonitoringSearchBar({
  value,
  onChangeText,
  onClear,
  placeholder = 'Cari petugas...',
}: MonitoringSearchBarProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="magnify" size={20} color={nbColors.gray['500']} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={nbColors.gray['400']}
        returnKeyType="search"
        clearButtonMode="never"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="close-circle" size={18} color={nbColors.gray['400']} />
        </TouchableOpacity>
      )}
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    height: 48,
    backgroundColor: nbColors.white,
    borderRadius: nbBorderRadius.full,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    paddingHorizontal: nbSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
    ...nbShadows.sm,
  },
  input: {
    flex: 1,
    fontSize: nbTypography.fontSize.base,
    color: nbColors.black,
    paddingVertical: 0,
  },
});
