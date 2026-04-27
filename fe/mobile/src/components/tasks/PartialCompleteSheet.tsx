/**
 * Partial Complete Sheet
 * Phase 3 3-6: Bottom sheet for partial task completion with remaining count calculation
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NBToast } from '../nb/NBToast';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { partialCompleteTask } from '../../store/slices/tasksSlice';
import { NBModal } from '../nb/NBModal';
import { NBButton } from '../nb/NBButton';
import { NBCardTextInput } from '../nb/NBCardTextInput';
import { NBText } from '../nb/NBText';
import { NBAlert } from '../nb/NBAlert';
import type { Task } from '../../types/models.types';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbBorderRadius,
  nbShadows,
} from '../../constants/nbTokens';

export interface PartialCompleteSheetProps {
  visible: boolean;
  onClose: () => void;
  task: Task | null;
  onSuccess?: () => void;
}

export function PartialCompleteSheet({
  visible,
  onClose,
  task,
  onSuccess,
}: PartialCompleteSheetProps): React.JSX.Element {
  const dispatch = useAppDispatch();
  const isSubmitting = useAppSelector((state) => state.tasks.isSubmitting);
  const error = useAppSelector((state) => state.tasks.error);

  const [completedCount, setCompletedCount] = useState('');
  const [notes, setNotes] = useState('');
  const [resumeTomorrow, setResumeTomorrow] = useState(false);
  const [validationError, setValidationError] = useState('');

  const targetCount = task?.target_plant_count ?? 0;
  const completedNum = parseInt(completedCount, 10) || 0;
  const remainingCount = Math.max(0, targetCount - completedNum);

  const handleClose = useCallback(() => {
    setCompletedCount('');
    setNotes('');
    setResumeTomorrow(false);
    setValidationError('');
    onClose();
  }, [onClose]);

  const validateForm = useCallback(() => {
    if (!completedCount || completedNum <= 0) {
      setValidationError('Jumlah diselesaikan harus lebih dari 0');
      return false;
    }
    if (completedNum > targetCount) {
      setValidationError(`Tidak boleh melebihi target (${targetCount})`);
      return false;
    }
    setValidationError('');
    return true;
  }, [completedCount, completedNum, targetCount]);

  const handleSubmit = useCallback(async () => {
    if (!task || !validateForm()) {
      return;
    }

    try {
      await dispatch(
        partialCompleteTask({
          taskId: task.id,
          dto: {
            completed_count: completedNum,
            notes: notes.trim() || undefined,
            resume_tomorrow: resumeTomorrow,
          },
        }),
      ).unwrap();

      NBToast.show({
        type: 'success',
        text1: 'BERHASIL',
        text2: 'Tugas sebagian diselesaikan',
      });
      handleClose();
      onSuccess?.();
    } catch {
      Alert.alert(
        'Error',
        error || 'Gagal menyelesaikan tugas sebagian',
      );
    }
  }, [task, completedNum, notes, resumeTomorrow, validateForm, dispatch, error, handleClose, onSuccess]);

  const footer = (
    <View style={styles.footerContent}>
      <NBButton
        title="BATAL"
        variant="secondary"
        size="md"
        onPress={handleClose}
        disabled={isSubmitting}
        style={styles.cancelButton}
      />
      <NBButton
        title="SIMPAN"
        variant="primary"
        size="md"
        onPress={handleSubmit}
        loading={isSubmitting}
        disabled={isSubmitting || !completedCount}
        style={styles.submitButton}
      />
    </View>
  );

  return (
    <NBModal
      visible={visible}
      onClose={handleClose}
      title="Selesai Sebagian"
      type="sheet"
      size="md"
      scrollable
      avoidKeyboard
      footer={footer}
      testID="partial-complete-sheet"
    >
      {!task ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
        </View>
      ) : (
        <View style={styles.content}>
          {/* Target Info */}
          <View style={styles.infoBox}>
            <NBText variant="caption" color="gray500" uppercase>
              Target Tanaman
            </NBText>
            <NBText variant="h2" color="black" style={styles.targetNumber}>
              {targetCount}
            </NBText>
          </View>

          {/* Completed Count Input */}
          <View style={styles.inputSection}>
            <NBCardTextInput
              label="Jumlah Diselesaikan"
              placeholder="0"
              value={completedCount}
              onChangeText={setCompletedCount}
              keyboardType="number-pad"
              maxLength={5}
              testID="completed-count-input"
              accessibilityLabel="Jumlah tanaman yang diselesaikan"
              accessibilityHint={`Masukkan angka antara 0 dan ${targetCount}`}
            />
          </View>

          {/* Remaining Count Display */}
          {completedNum > 0 && (
            <View style={styles.remainingBox}>
              <NBText variant="body-sm" color="gray600">
                Sisa untuk dilanjutkan
              </NBText>
              <NBText variant="h3" color="primary" style={styles.remainingNumber}>
                {remainingCount}
              </NBText>
            </View>
          )}

          {/* Resume Tomorrow Toggle */}
          <View style={styles.toggleSection}>
            <NBButton
              title={resumeTomorrow ? '✓ LANJUTKAN BESOK' : 'LANJUTKAN BESOK'}
              variant={resumeTomorrow ? 'primary' : 'secondary'}
              size="md"
              onPress={() => setResumeTomorrow(!resumeTomorrow)}
              fullWidth
              testID="resume-tomorrow-toggle"
              accessibilityLabel={`Buat tugas anak untuk melanjutkan besok: ${resumeTomorrow ? 'aktif' : 'nonaktif'}`}
              accessibilityRole="switch"
              accessibilityState={{ checked: resumeTomorrow }}
            />
            <NBText variant="caption" color="gray500" style={styles.toggleHint}>
              Jika diaktifkan, backend akan membuat tugas anak untuk melanjutkan {remainingCount} tanaman
            </NBText>
          </View>

          {/* Notes Input */}
          <View style={styles.inputSection}>
            <NBCardTextInput
              label="Catatan (Opsional)"
              placeholder="Masukkan catatan atau kendala..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              maxLength={500}
              testID="notes-input"
              accessibilityLabel="Catatan tambahan"
              accessibilityHint="Jelaskan kendala atau catatan penting tentang penyelesaian tugas"
            />
          </View>

          {/* Validation Error */}
          {validationError && (
            <NBAlert
              variant="danger"
              title="Validasi"
              message={validationError}
              style={styles.errorAlert}
              testID="validation-error"
            />
          )}

          {/* Form Error from API */}
          {error && !validationError && (
            <NBAlert
              variant="danger"
              title="Error"
              message={error}
              style={styles.errorAlert}
              testID="api-error"
            />
          )}
        </View>
      )}
    </NBModal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: nbSpacing.md,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBox: {
    backgroundColor: nbColors.bgAccentMint,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.sm,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    alignItems: 'center',
  },
  targetNumber: {
    marginTop: nbSpacing.sm,
  },
  inputSection: {
    gap: nbSpacing.sm,
  },
  remainingBox: {
    backgroundColor: nbColors.bgAccentGreen,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.sm,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    alignItems: 'center',
    ...nbShadows.xs,
  },
  remainingNumber: {
    marginTop: nbSpacing.sm,
  },
  toggleSection: {
    gap: nbSpacing.sm,
  },
  toggleHint: {
    paddingHorizontal: nbSpacing.sm,
  },
  errorAlert: {
    marginTop: nbSpacing.sm,
  },
  footerContent: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});
