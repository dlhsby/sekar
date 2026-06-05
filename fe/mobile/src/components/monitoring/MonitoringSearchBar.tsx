/**
 * MonitoringSearchBar
 *
 * Compact pill floating over the monitoring map. It is now a non-editable
 * trigger: tapping it opens the fullscreen MonitoringSearchModal (typing happens
 * there). Kept bespoke (not NBTextInput — that's a labeled form field) on
 * canonical tokens, with accessibility annotations.
 *
 * React.memo'd — it lives on the hot map-render path.
 */

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBText } from '../nb/NBText';
import { nbColors, nbBorders, nbRadius, nbSpacing, nbShadows } from '../../constants/nbTokens';

interface MonitoringSearchBarProps {
  /** Opens the search modal. */
  onPress: () => void;
  /** Active query text shown in the pill (optional — empty shows the placeholder). */
  value?: string;
  /** Clears the active query (shows the × affordance when `value` is non-empty). */
  onClear?: () => void;
  placeholder?: string;
  testID?: string;
}

export const MonitoringSearchBar = React.memo(function MonitoringSearchBar({
  onPress,
  value,
  onClear,
  placeholder = 'Cari petugas, area, rayon…',
  testID = 'monitoring-search',
}: MonitoringSearchBarProps): React.JSX.Element {
  const hasValue = !!value && value.length > 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="search"
      accessibilityLabel={hasValue ? `Pencarian: ${value}` : placeholder}
      testID={testID}
    >
      <MaterialCommunityIcons name="magnify" size={20} color={nbColors.gray500} />
      <NBText
        variant="body"
        color={hasValue ? 'black' : 'gray400'}
        numberOfLines={1}
        style={styles.text}
      >
        {hasValue ? value : placeholder}
      </NBText>
      {hasValue && onClear ? (
        <TouchableOpacity
          onPress={onClear}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Hapus pencarian"
          testID={`${testID}-clear`}
        >
          <MaterialCommunityIcons name="close-circle" size={18} color={nbColors.gray400} />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    height: 48,
    backgroundColor: nbColors.white,
    borderRadius: nbRadius.full,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    paddingHorizontal: nbSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
    ...nbShadows.sm,
  },
  text: {
    flex: 1,
  },
});
