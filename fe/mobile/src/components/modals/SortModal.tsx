import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBModal } from '../nb';
import { nbColors, nbTypography, nbBorders, nbSpacing } from '../../constants/nbTokens';

export interface SortOption {
  key: string;
  label: string;
}

interface SortModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: SortOption[];
  selectedOption: string;
  onSelect: (key: string) => void;
}

export function SortModal({
  visible,
  onClose,
  title,
  options,
  selectedOption,
  onSelect,
}: SortModalProps): React.JSX.Element {
  const handleSelect = (key: string) => {
    onSelect(key);
    onClose();
  };

  return (
    <NBModal visible={visible} onClose={onClose} title={title} size="sm" noPadding>
      <View>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            style={[styles.option, selectedOption === opt.key && styles.optionActive]}
            onPress={() => handleSelect(opt.key)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected: selectedOption === opt.key }}
          >
            <Text style={[styles.optionText, selectedOption === opt.key && styles.optionTextActive]}>
              {opt.label}
            </Text>
            {selectedOption === opt.key && (
              <MaterialCommunityIcons name="check-bold" size={18} color={nbColors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </NBModal>
  );
}

const styles = StyleSheet.create({
  option: {
    minHeight: 52,
    paddingHorizontal: nbSpacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: nbBorders.base,
    borderBottomColor: nbColors.gray200,
  },
  optionActive: {
    borderLeftWidth: nbBorders.thick,
    borderLeftColor: nbColors.primary,
    paddingLeft: nbSpacing.sm,
  },
  optionText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.black,
  },
  optionTextActive: {
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
});
