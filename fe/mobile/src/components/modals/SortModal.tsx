/**
 * SortModal
 * Reusable bottom-sheet modal for sorting lists.
 * Generic version extracted from TasksActivityScreen's SortModal.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { nbColors, nbTypography, nbBorders } from '../../constants/nbTokens';

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
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.sortModalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={styles.sortModalSheet}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.sortModalHeader}>
            <Text style={styles.sortModalTitle}>{title}</Text>
            <TouchableOpacity
              style={styles.sortModalCloseButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Tutup modal urutan"
            >
              <MaterialCommunityIcons name="close" size={20} color={nbColors.black} />
            </TouchableOpacity>
          </View>
          <View style={styles.sortModalDivider} />
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortOption, selectedOption === opt.key && styles.sortOptionActive]}
              onPress={() => handleSelect(opt.key)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={opt.label}
              accessibilityState={{ selected: selectedOption === opt.key }}
            >
              <Text style={[styles.sortOptionText, selectedOption === opt.key && styles.sortOptionTextActive]}>
                {opt.label}
              </Text>
              {selectedOption === opt.key && (
                <MaterialCommunityIcons name="check-bold" size={18} color={nbColors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sortModalSheet: {
    backgroundColor: nbColors.white,
    borderTopWidth: nbBorders.thick,
    borderLeftWidth: nbBorders.thick,
    borderRightWidth: nbBorders.thick,
    borderBottomWidth: 0,
    borderColor: nbColors.black,
  },
  sortModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: nbColors.gray[100],
  },
  sortModalTitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    color: nbColors.black,
    flex: 1,
  },
  sortModalCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  sortModalDivider: {
    height: nbBorders.thick,
    backgroundColor: nbColors.black,
  },
  sortOption: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    borderBottomWidth: 1,
    borderBottomColor: nbColors.gray[200],
  },
  sortOptionActive: {
    borderLeftWidth: 4,
    borderLeftColor: nbColors.primary,
    paddingLeft: 12,
  },
  sortOptionText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: '400' as const,
    color: nbColors.black,
  },
  sortOptionTextActive: {
    fontWeight: '700' as const,
    color: nbColors.black,
  },
});
