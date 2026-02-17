/**
 * NBSelect Component
 * Neo Brutalism dropdown select component using Modal for option list
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbSpacing,
  nbTextStyles,
  nbBorders,
  nbShadows,
  withAlpha,
} from '../../constants/nbTokens';

export interface NBSelectOption {
  label: string;
  value: string;
}

export interface NBSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: NBSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function NBSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Pilih...',
  disabled = false,
  style,
}: NBSelectProps): JSX.Element {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find(o => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled, style]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={disabled ? 1 : 0.7}
      >
        <Text
          style={[styles.triggerText, disabled && styles.triggerTextDisabled]}
          numberOfLines={1}
        >
          {displayLabel}
        </Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={20}
          color={disabled ? nbColors.gray['400'] : nbColors.black}
        />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={styles.sheet}>
            <FlatList
              data={options}
              keyExtractor={item => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item.value === value && styles.optionSelected,
                  ]}
                  onPress={() => handleSelect(item.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.value === value && styles.optionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <MaterialCommunityIcons
                      name="check"
                      size={18}
                      color={nbColors.primary}
                    />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: nbBorders.medium,
    borderColor: nbColors.black,
    borderRadius: 0,
    paddingHorizontal: nbSpacing[3],
    paddingVertical: nbSpacing[2],
    backgroundColor: nbColors.white,
    ...nbShadows.sm,
  },
  triggerDisabled: {
    backgroundColor: nbColors.gray['100'],
    borderColor: nbColors.gray['300'],
  },
  triggerText: {
    ...nbTextStyles.body,
    color: nbColors.black,
    flex: 1,
    marginRight: nbSpacing[2],
  },
  triggerTextDisabled: {
    color: nbColors.gray['400'],
  },
  overlay: {
    flex: 1,
    backgroundColor: withAlpha(nbColors.black, 0.4),
    justifyContent: 'center',
    paddingHorizontal: nbSpacing[6],
  },
  sheet: {
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.thick,
    borderColor: nbColors.black,
    maxHeight: 320,
    ...nbShadows.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: nbSpacing[4],
    paddingVertical: nbSpacing[3],
  },
  optionSelected: {
    backgroundColor: withAlpha(nbColors.primary, 0.1),
  },
  optionText: {
    ...nbTextStyles.body,
    color: nbColors.black,
    flex: 1,
  },
  optionTextSelected: {
    color: nbColors.primary,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: nbColors.gray['200'],
  },
});
