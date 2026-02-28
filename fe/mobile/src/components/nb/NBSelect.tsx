/**
 * NBSelect Component
 * Neo Brutalism dropdown select component — bottom-sheet variant
 * Phase 2C: slide-up sheet, animated chevron, accent left-border for selected row
 * Supports single-select, multi-select, clearable, and searchable modes
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Animated,
  Dimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbBorders,
  nbShadows,
  nbTypography,
  nbAnimation,
  nbTouchTarget,
} from '../../constants/nbTokens';

export interface NBSelectOption {
  label: string;
  value: string;
}

export interface NBSelectProps {
  /** Current value (single-select mode) */
  value?: string;
  /** Callback when value changes (single-select mode) */
  onValueChange?: (value: string) => void;
  /** Current selected values (multi-select mode) */
  selectedValues?: string[];
  /** Callback when selected values change (multi-select mode) */
  onValuesChange?: (values: string[]) => void;
  options: NBSelectOption[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Allow clearing the selection */
  clearable?: boolean;
  style?: StyleProp<ViewStyle>;
}

const WINDOW_HEIGHT = Dimensions.get('window').height;

export function NBSelect({
  value,
  onValueChange,
  selectedValues,
  onValuesChange,
  options,
  placeholder = 'Pilih...',
  label,
  disabled = false,
  searchable = false,
  searchPlaceholder = 'Cari...',
  clearable = false,
  style,
}: NBSelectProps): JSX.Element {
  const isMulti = selectedValues !== undefined && onValuesChange !== undefined;
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const insets = useSafeAreaInsets();
  const chevronAnim = useRef(new Animated.Value(0)).current;

  // Display label logic
  const displayLabel = useMemo(() => {
    if (isMulti) {
      if (!selectedValues || selectedValues.length === 0) return placeholder;
      const names = selectedValues
        .map(v => options.find(o => o.value === v)?.label)
        .filter(Boolean);
      return names.length <= 2
        ? names.join(', ')
        : `${names.length} dipilih`;
    }
    const selectedOption = options.find(o => o.value === value);
    return selectedOption ? selectedOption.label : placeholder;
  }, [isMulti, value, selectedValues, options, placeholder]);

  const hasSelection = isMulti
    ? (selectedValues && selectedValues.length > 0)
    : Boolean(value);

  const sheetTitle = label ?? placeholder;

  const openSheet = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    Animated.timing(chevronAnim, {
      toValue: 1,
      duration: nbAnimation.normal,
      useNativeDriver: true,
    }).start();
  }, [disabled, chevronAnim]);

  const closeSheet = useCallback(() => {
    setOpen(false);
    setSearchQuery('');
    Animated.timing(chevronAnim, {
      toValue: 0,
      duration: nbAnimation.normal,
      useNativeDriver: true,
    }).start();
  }, [chevronAnim]);

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, searchQuery, searchable]);

  const handleSingleSelect = useCallback(
    (optionValue: string) => {
      onValueChange?.(optionValue);
      closeSheet();
    },
    [onValueChange, closeSheet],
  );

  const handleMultiToggle = useCallback(
    (optionValue: string) => {
      if (!selectedValues || !onValuesChange) return;
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter(v => v !== optionValue)
        : [...selectedValues, optionValue];
      onValuesChange(newValues);
    },
    [selectedValues, onValuesChange],
  );

  const handleClear = useCallback(() => {
    if (isMulti) {
      onValuesChange?.([]);
    } else {
      onValueChange?.('');
    }
    closeSheet();
  }, [isMulti, onValueChange, onValuesChange, closeSheet]);

  const chevronRotation = chevronAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const triggerShadow = disabled
    ? nbShadows.none
    : open
    ? nbShadows.active
    : nbShadows.md;

  const renderOption = useCallback(
    ({ item }: { item: NBSelectOption }) => {
      const isSelected = isMulti
        ? selectedValues?.includes(item.value)
        : item.value === value;

      const onPress = isMulti
        ? () => handleMultiToggle(item.value)
        : () => handleSingleSelect(item.value);

      return (
        <TouchableOpacity
          style={[styles.option, isSelected && styles.optionSelected]}
          onPress={onPress}
          activeOpacity={0.7}
        >
          {isMulti && (
            <MaterialCommunityIcons
              name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={22}
              color={isSelected ? nbColors.primary : nbColors.gray['400']}
              style={styles.checkboxIcon}
            />
          )}
          <Text
            style={[
              styles.optionText,
              isSelected && styles.optionTextSelected,
            ]}
          >
            {item.label}
          </Text>
          {!isMulti && isSelected && (
            <MaterialCommunityIcons
              name="check-bold"
              size={20}
              color={nbColors.primary}
            />
          )}
        </TouchableOpacity>
      );
    },
    [isMulti, value, selectedValues, handleSingleSelect, handleMultiToggle],
  );

  const keyExtractor = useCallback((item: NBSelectOption) => item.value, []);

  const ItemSeparator = useCallback(
    () => <View style={styles.separator} />,
    [],
  );

  return (
    <>
      <TouchableOpacity
        style={[
          styles.trigger,
          disabled && styles.triggerDisabled,
          triggerShadow,
          style,
        ]}
        onPress={openSheet}
        activeOpacity={disabled ? 1 : 0.7}
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: open }}
      >
        <Text
          style={[
            styles.triggerText,
            !hasSelection && styles.triggerTextPlaceholder,
            disabled && styles.triggerTextDisabled,
          ]}
          numberOfLines={1}
        >
          {displayLabel}
        </Text>
        {clearable && hasSelection && !disabled ? (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={20}
              color={nbColors.gray['500']}
            />
          </TouchableOpacity>
        ) : (
          <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
            <MaterialCommunityIcons
              name="chevron-down"
              size={22}
              color={disabled ? nbColors.gray['400'] : nbColors.black}
            />
          </Animated.View>
        )}
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={closeSheet}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeSheet}
        >
          {/* Inner container — stops touch propagation so tapping sheet doesn't close modal */}
          <View
            style={[
              styles.sheet,
              { paddingBottom: insets.bottom + 8 },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {/* Sheet header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{sheetTitle}</Text>
              {isMulti && selectedValues && selectedValues.length > 0 && (
                <TouchableOpacity
                  style={styles.clearAllButton}
                  onPress={() => onValuesChange?.([])}
                >
                  <Text style={styles.clearAllText}>Hapus Semua</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.sheetCloseButton}
                onPress={closeSheet}
                accessibilityRole="button"
                accessibilityLabel="Tutup"
              >
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color={nbColors.black}
                />
              </TouchableOpacity>
            </View>

            {/* Header divider */}
            <View style={styles.headerDivider} />

            {searchable && (
              <View style={styles.searchContainer}>
                <MaterialCommunityIcons
                  name="magnify"
                  size={20}
                  color={nbColors.gray['400']}
                />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={nbColors.gray['400']}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <MaterialCommunityIcons
                      name="close-circle"
                      size={18}
                      color={nbColors.gray['400']}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Clear option for single-select clearable */}
            {clearable && !isMulti && hasSelection && (
              <>
                <TouchableOpacity
                  style={styles.clearOption}
                  onPress={handleClear}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="close-circle-outline"
                    size={20}
                    color={nbColors.danger}
                  />
                  <Text style={styles.clearOptionText}>Hapus Pilihan</Text>
                </TouchableOpacity>
                <View style={styles.separator} />
              </>
            )}

            <FlatList
              data={filteredOptions}
              keyExtractor={keyExtractor}
              renderItem={renderOption}
              ItemSeparatorComponent={ItemSeparator}
              bounces={false}
              showsVerticalScrollIndicator={false}
            />

            {/* Done button for multi-select */}
            {isMulti && (
              <View style={styles.doneButtonContainer}>
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={closeSheet}
                  activeOpacity={0.7}
                >
                  <Text style={styles.doneButtonText}>
                    Selesai{selectedValues && selectedValues.length > 0 ? ` (${selectedValues.length})` : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: nbTouchTarget.minHeight,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 0,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    backgroundColor: nbColors.white,
  },
  triggerDisabled: {
    backgroundColor: nbColors.gray['100'],
    borderColor: nbColors.gray['400'],
    borderWidth: nbBorders.thin,
    opacity: 0.6,
  },
  triggerText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: '600',
    color: nbColors.black,
    flex: 1,
    marginRight: 8,
  },
  triggerTextPlaceholder: {
    color: nbColors.gray['400'],
    fontWeight: '400',
  },
  triggerTextDisabled: {
    color: nbColors.gray['400'],
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: nbColors.white,
    borderTopWidth: nbBorders.thick,
    borderLeftWidth: nbBorders.thick,
    borderRightWidth: nbBorders.thick,
    borderBottomWidth: 0,
    borderColor: nbColors.black,
    borderRadius: 0,
    maxHeight: WINDOW_HEIGHT * 0.5,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: nbColors.gray['100'],
  },
  sheetTitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: nbColors.black,
    flex: 1,
  },
  sheetCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearAllButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearAllText: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: '600',
    color: nbColors.danger,
    textTransform: 'uppercase',
  },
  headerDivider: {
    height: nbBorders.thick,
    backgroundColor: nbColors.black,
  },
  option: {
    minHeight: 52,
    paddingLeft: 16,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionSelected: {
    borderLeftWidth: 4,
    borderLeftColor: nbColors.primary,
    paddingLeft: 12,
  },
  optionText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: '400',
    color: nbColors.black,
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: '700',
    color: nbColors.black,
  },
  checkboxIcon: {
    marginRight: 12,
  },
  separator: {
    height: 1,
    backgroundColor: nbColors.gray['200'],
    marginLeft: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: nbColors.gray['200'],
    backgroundColor: nbColors.white,
  },
  searchInput: {
    flex: 1,
    fontSize: nbTypography.fontSize.base,
    color: nbColors.black,
    marginLeft: 8,
    marginRight: 8,
    paddingVertical: 4,
  },
  clearOption: {
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: nbColors.gray['50'],
  },
  clearOptionText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: '500',
    color: nbColors.danger,
    marginLeft: 10,
  },
  doneButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: nbBorders.thick,
    borderTopColor: nbColors.black,
  },
  doneButton: {
    backgroundColor: nbColors.primary,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
  },
  doneButtonText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: '700',
    color: nbColors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
