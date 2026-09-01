import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBModal } from '../nb/NBModal';
import { NBText } from '../nb/NBText';
import { NBButton } from '../nb/NBButton';
import { nbColors, nbSpacing, nbBorders, nbRadius, withAlpha } from '../../constants/nbTokens';
import type { ShiftOption } from '../../types/api.types';

interface ShiftPickerSheetProps {
  visible: boolean;
  options: ShiftOption[];
  /** The currently chosen option's shift_definition_id + service_day key. */
  value?: ShiftOption | null;
  onSelect: (option: ShiftOption) => void;
  onClose: () => void;
}

const keyOf = (o: ShiftOption): string => `${o.service_day}:${o.shift_definition_id}`;

/**
 * ShiftPickerSheet — which shift a clock-in belongs to (ADR-055 attribution
 * window). Near midnight or for a dangling shift the worker may have more than
 * one candidate — the shift about to start (`early`), the one running
 * (`covering`), or the one just ended (`grace`). The list is best-first; the
 * default is pre-selected so the common case is one tap → confirm.
 */
export function ShiftPickerSheet({
  visible,
  options,
  value,
  onSelect,
  onClose,
}: ShiftPickerSheetProps): React.JSX.Element {
  const { t } = useTranslation();
  const [pending, setPending] = useState<ShiftOption | null>(value ?? options[0] ?? null);

  // Re-seed from the committed value (or the default option) each open.
  useEffect(() => {
    if (visible) setPending(value ?? options.find((o) => o.is_default) ?? options[0] ?? null);
  }, [visible, value, options]);

  const phaseLabel = (o: ShiftOption): string => t(`attendance:clockInOut.shiftPhase.${o.phase}`);

  const footer = (
    <View style={styles.footer}>
      <NBButton
        title={t('common:actions.cancel')}
        onPress={onClose}
        variant="secondary"
        style={styles.footerButton}
      />
      <NBButton
        title={t('attendance:clockInOut.confirmSelect')}
        onPress={() => {
          if (pending) onSelect(pending);
          onClose();
        }}
        variant="primary"
        disabled={!pending}
        style={styles.footerButton}
      />
    </View>
  );

  return (
    <NBModal
      type="sheet"
      visible={visible}
      onClose={onClose}
      title={t('attendance:clockInOut.selectShiftTitle')}
      footer={footer}
      testID="shift-picker-sheet"
    >
      <View style={styles.list}>
        {options.length === 0 && (
          <NBText variant="body-sm" color="gray500" style={styles.empty}>
            {t('attendance:clockInOut.noShiftOptions')}
          </NBText>
        )}
        {options.map((option) => {
          const selected = pending != null && keyOf(pending) === keyOf(option);
          return (
            <TouchableOpacity
              key={keyOf(option)}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => setPending(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.shift_name ?? phaseLabel(option)}
              activeOpacity={0.7}
              testID={`shift-picker-option-${option.shift_definition_id}`}
            >
              <MaterialCommunityIcons
                name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                size={22}
                color={selected ? nbColors.primary : nbColors.gray500}
              />
              <View style={styles.optionText}>
                <NBText variant="body" color="black">
                  {option.shift_name ?? option.shift_definition_id}
                </NBText>
                <NBText variant="caption" color="gray500" style={styles.optionMeta}>
                  {phaseLabel(option)} · {option.service_day}
                </NBText>
              </View>
              {option.is_default && (
                <NBText variant="caption" color="primary">
                  {t('attendance:clockInOut.shiftDefault')}
                </NBText>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </NBModal>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: nbSpacing.sm,
    paddingBottom: nbSpacing.sm,
  },
  empty: {
    paddingVertical: nbSpacing.md,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    paddingHorizontal: nbSpacing.md,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.md,
    backgroundColor: nbColors.white,
  },
  optionSelected: {
    backgroundColor: withAlpha(nbColors.primary, 0.12),
  },
  optionText: {
    flex: 1,
  },
  optionMeta: {
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
  },
  footerButton: {
    flex: 1,
  },
});

export default ShiftPickerSheet;
