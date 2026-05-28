import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBModal, NBText } from '../nb';
import { nbColors, nbBorders, nbSpacing } from '../../constants/nbTokens';

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
    <NBModal visible={visible} onClose={onClose} title={title} noPadding>
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
            <NBText
              variant="body"
              color={selectedOption === opt.key ? 'black' : 'black'}
              style={selectedOption === opt.key ? styles.optionTextActive : undefined}
            >
              {opt.label}
            </NBText>
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
    borderBottomWidth: nbBorders.widthBase,
    borderBottomColor: nbColors.gray200,
  },
  optionActive: {
    borderLeftWidth: nbBorders.widthThick,
    borderLeftColor: nbColors.primary,
    paddingLeft: nbSpacing.sm,
  },
  optionTextActive: {
    fontWeight: '700',
  },
});
