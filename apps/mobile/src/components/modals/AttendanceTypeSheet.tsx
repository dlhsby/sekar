import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBModal } from '../nb/NBModal';
import { NBText } from '../nb/NBText';
import { NBButton } from '../nb/NBButton';
import { nbColors, nbSpacing, nbBorders, nbRadius, withAlpha } from '../../constants/nbTokens';

/** The two attendance labels a worker can record (Catapa-style "label waktu"). */
export type AttendanceAction = 'clock_in' | 'clock_out';

interface AttendanceTypeSheetProps {
  visible: boolean;
  /** The currently committed action (drives the primary button on the screen). */
  value: AttendanceAction;
  onSelect: (value: AttendanceAction) => void;
  onClose: () => void;
  /**
   * The action that is NOT valid given the worker's current state (you cannot
   * clock in with an open shift, nor clock out without one). Shown but flagged,
   * so the picker stays honest instead of letting a doomed choice through.
   */
  disabledAction?: AttendanceAction;
  /** One-line reason the disabled action can't be picked right now. */
  disabledHint?: string;
}

const ORDER: AttendanceAction[] = ['clock_in', 'clock_out'];

/**
 * AttendanceTypeSheet — the "Ubah Label Waktu" picker.
 *
 * SEKAR derives the default label from shift state (an open shift → Clock Out,
 * none → Clock In), but a worker with a dangling/overrun shift or back-to-back
 * shifts may need to pick the other one. This sheet lets them, while flagging the
 * choice that can't currently proceed so the screen never submits a doomed action.
 */
export function AttendanceTypeSheet({
  visible,
  value,
  onSelect,
  onClose,
  disabledAction,
  disabledHint,
}: AttendanceTypeSheetProps): React.JSX.Element {
  const { t } = useTranslation();
  const [pending, setPending] = useState<AttendanceAction>(value);

  // Re-seed the local choice from the committed value each time the sheet opens,
  // so cancelling never leaves a stale selection behind.
  useEffect(() => {
    if (visible) setPending(value);
  }, [visible, value]);

  const label = (a: AttendanceAction): string =>
    a === 'clock_in' ? t('attendance:list.button.clockIn') : t('attendance:list.button.clockOut');

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
          onSelect(pending);
          onClose();
        }}
        variant="primary"
        style={styles.footerButton}
      />
    </View>
  );

  return (
    <NBModal
      type="sheet"
      visible={visible}
      onClose={onClose}
      title={t('attendance:clockInOut.selectLabelTitle')}
      footer={footer}
      testID="attendance-type-sheet"
    >
      <View style={styles.list}>
        {ORDER.map((action) => {
          const selected = pending === action;
          const isDisabled = disabledAction === action;
          return (
            <TouchableOpacity
              key={action}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => setPending(action)}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: isDisabled }}
              accessibilityLabel={label(action)}
              activeOpacity={0.7}
              testID={`attendance-type-option-${action}`}
            >
              <MaterialCommunityIcons
                name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                size={22}
                color={selected ? nbColors.primary : nbColors.gray500}
              />
              <View style={styles.optionText}>
                <NBText variant="body" color={isDisabled ? 'gray500' : 'black'}>
                  {label(action)}
                </NBText>
                {isDisabled && !!disabledHint && (
                  <NBText variant="caption" color="warning" style={styles.optionHint}>
                    {disabledHint}
                  </NBText>
                )}
              </View>
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
  optionHint: {
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

export default AttendanceTypeSheet;
