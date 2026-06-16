/**
 * Condition Selector Component
 * Chip-based selector for asset condition (good/fair/poor/damaged/unusable)
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { NBText } from '../../../components/nb';
import { nbColors, nbSpacing, nbBorders, nbRadius } from '../../../constants/nbTokens';
import type { AssetCondition } from '../../../types/assets.types';

export const CHECKOUT_CONDITIONS: AssetCondition[] = [
  'good',
  'fair',
  'poor',
  'damaged',
];

const RETURN_CONDITIONS: AssetCondition[] = [
  'good',
  'fair',
  'poor',
  'damaged',
  'unusable',
];

const CONDITION_LABELS: Record<AssetCondition, string> = {
  good: 'Baik',
  fair: 'Cukup',
  poor: 'Buruk',
  damaged: 'Rusak',
  unusable: 'Tidak Layak',
};

const CONDITION_COLORS: Record<AssetCondition, string> = {
  good: nbColors.success,
  fair: nbColors.warning,
  poor: nbColors.danger,
  damaged: nbColors.danger,
  unusable: nbColors.dangerDark,
};

interface ConditionSelectorProps {
  value?: AssetCondition;
  onSelect: (condition: AssetCondition) => void;
  isReturn?: boolean;
  label?: string;
}

export function ConditionSelector({
  value,
  onSelect,
  isReturn = false,
  label = 'Kondisi',
}: ConditionSelectorProps): React.JSX.Element {
  const conditions = isReturn ? RETURN_CONDITIONS : CHECKOUT_CONDITIONS;

  return (
    <View style={styles.container}>
      <NBText variant="body" style={styles.label}>
        {label}
      </NBText>
      <View style={styles.chipContainer}>
        {conditions.map((condition) => {
          const isSelected = value === condition;
          const color = CONDITION_COLORS[condition];

          return (
            <TouchableOpacity
              key={condition}
              activeOpacity={0.7}
              onPress={() => onSelect(condition)}
              style={[
                styles.chip,
                isSelected && [
                  styles.chipSelected,
                  { borderColor: color, backgroundColor: color },
                ],
                !isSelected && { borderColor: nbColors.black },
              ]}
            >
              <NBText
                variant="caption"
                style={[
                  styles.chipText,
                  isSelected && { color: nbColors.white },
                  !isSelected && { color: nbColors.black },
                ]}
              >
                {CONDITION_LABELS[condition]}
              </NBText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: nbSpacing.sm,
  },
  label: {
    fontWeight: '600',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: nbSpacing.sm,
  },
  chip: {
    paddingVertical: nbSpacing.xs,
    paddingHorizontal: nbSpacing.sm,
    borderWidth: nbBorders.widthThin,
    borderRadius: nbRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipSelected: {
    borderWidth: nbBorders.widthBase,
  },
  chipText: {
    textAlign: 'center',
  },
});
