/**
 * Seed Transaction Form Screen (Phase 3 3-12)
 * Record a new transaction (purchase, distribution, adjustment)
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import {
  NBButton,
  NBText,
  NBCard,
  NBSelect,
  NBTextInput,
  NBBackgroundPattern,
  NBDatePicker,
} from '../../components/nb';
import { nbColors, nbSpacing, nbBorders, nbRadius } from '../../constants/nbTokens';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { recordTransaction } from '../../store/slices/plantSeedsSlice';
import type { MainTabScreenProps } from '../../types/navigation.types';

type Props = MainTabScreenProps<'SeedTransactionForm'>;

const TRANSACTION_TYPES = [
  { value: 'purchase', label: 'Pembelian' },
  { value: 'distribution', label: 'Distribusi' },
  { value: 'adjustment', label: 'Penyesuaian' },
];

export function SeedTransactionFormScreen({ route }: Props): React.JSX.Element {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { seedId } = route.params;

  const { isRecording, recordError } = useAppSelector((state) => state.plantSeeds);

  const [transactionType, setTransactionType] = useState<'purchase' | 'distribution' | 'adjustment'>(
    'purchase'
  );
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!qty || isNaN(Number(qty)) || Number(qty) <= 0) {
      newErrors.qty = 'Jumlah harus lebih dari 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [qty]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    const occurredAtStr = occurredAt.toISOString().split('T')[0]; // YYYY-MM-DD format

    await dispatch(
      recordTransaction({
        seedId,
        data: {
          transactionType,
          qty: Number(qty),
          occurredAt: occurredAtStr,
          notes: notes || undefined,
        },
      })
    );

    // Navigate back after successful submission
    // The thunk error handling will show the error in recordError
    if (!recordError) {
      navigation.goBack();
    }
  }, [validate, seedId, transactionType, qty, occurredAt, notes, dispatch, recordError, navigation]);

  return (
    <View style={styles.container}>
      <NBBackgroundPattern />

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <NBCard style={styles.card}>
          <View style={styles.cardContent}>
            <NBText variant="h2" style={styles.title}>
              Catat Transaksi
            </NBText>

            {recordError && (
              <View style={styles.errorBanner}>
                <NBText variant="body-sm" color="danger">
                  {recordError}
                </NBText>
              </View>
            )}

            {/* Transaction Type Select */}
            <View style={styles.formGroup}>
              <NBText variant="body" style={styles.label}>
                Tipe Transaksi
              </NBText>
              <NBSelect
                options={TRANSACTION_TYPES}
                value={transactionType}
                onValueChange={(value) =>
                  setTransactionType(value as 'purchase' | 'distribution' | 'adjustment')
                }
                placeholder="Pilih tipe transaksi"
              />
            </View>

            {/* Quantity Input */}
            <View style={styles.formGroup}>
              <NBText variant="body" style={styles.label}>
                Jumlah {errors.qty && <NBText color="danger">*</NBText>}
              </NBText>
              <NBTextInput
                placeholder="Masukkan jumlah"
                value={qty}
                onChangeText={setQty}
                keyboardType="decimal-pad"
              />
              {errors.qty && (
                <NBText variant="body-sm" color="danger" style={styles.errorText}>
                  {errors.qty}
                </NBText>
              )}
            </View>

            {/* Date Picker */}
            <View style={styles.formGroup}>
              <NBText variant="body" style={styles.label}>
                Tanggal Transaksi
              </NBText>
              <NBDatePicker
                value={occurredAt}
                onChange={setOccurredAt}
                mode="date"
              />
            </View>

            {/* Notes Input */}
            <View style={styles.formGroup}>
              <NBText variant="body" style={styles.label}>
                Catatan (Opsional)
              </NBText>
              <NBTextInput
                placeholder="Masukkan catatan tambahan"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Submit Buttons */}
            <View style={styles.buttonGroup}>
              <NBButton
                variant="primary"
                onPress={handleSubmit}
                disabled={isRecording}
                loading={isRecording}
                style={styles.submitButton}
              >
                Simpan Transaksi
              </NBButton>
              <NBButton
                variant="secondary"
                onPress={() => navigation.goBack()}
                disabled={isRecording}
              >
                Batal
              </NBButton>
            </View>
          </View>
        </NBCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: nbColors.white,
  },
  contentContainer: {
    padding: nbSpacing.md,
    paddingBottom: nbSpacing.lg,
  },
  card: {
    padding: nbSpacing.md,
  },
  cardContent: {
    gap: nbSpacing.md,
  },
  title: {
    fontWeight: '700',
  },
  errorBanner: {
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
    borderRadius: nbRadius.base,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.danger,
  },
  formGroup: {
    gap: nbSpacing.xs,
  },
  label: {
    fontWeight: '500',
  },
  dateButton: {
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.gray300,
    backgroundColor: nbColors.gray50,
    minHeight: 44,
    justifyContent: 'center',
  },
  errorText: {
    fontWeight: '500',
  },
  buttonGroup: {
    gap: nbSpacing.sm,
    marginTop: nbSpacing.md,
  },
  submitButton: {
    marginBottom: nbSpacing.xs,
  },
});
