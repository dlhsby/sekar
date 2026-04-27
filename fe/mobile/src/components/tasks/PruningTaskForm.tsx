/**
 * Pruning Task Form Component
 * Form for creating pruning tasks with species selection
 * Phase 3 3-7 (ADR-031)
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { PlantSpecies } from '../../types/models.types';
import { NBSelect, type NBSelectOption } from '../nb/NBSelect';
import { NBCardTextInput } from '../nb/NBCardTextInput';
import { NBButton } from '../nb/NBButton';
import { NBText } from '../nb/NBText';
import { SpeciesAutocomplete } from './SpeciesAutocomplete';
import { nbSpacing } from '../../constants/nbTokens';

/** ADR-031: Task case type classification */
type CaseType = 'GT' | 'PT' | 'PS' | 'PD' | 'PK';

/** ADR-031: Pruning action type */
type PruningAction = 'PM' | 'PB' | 'PC';

/** ADR-031: Task source type */
type TaskSource = 'TIW' | 'TS' | 'CC' | 'PW' | 'Wk';

export interface PruningTaskFormPayload {
  case_type: CaseType;
  pruning_action: PruningAction;
  source: TaskSource;
  species: PlantSpecies[];
  notes?: string;
}

export interface PruningTaskFormProps {
  /** Callback when form is submitted with valid data */
  onSubmit: (payload: PruningTaskFormPayload) => void;
  /** Is form in loading state (e.g., submitting) */
  isLoading?: boolean;
  /** Container style */
  style?: StyleProp<ViewStyle>;
}

/** Case type options (Indonesian labels per ADR-031) */
const CASE_TYPE_OPTIONS: NBSelectOption[] = [
  { label: 'Gangguan Tinggi', value: 'GT' },
  { label: 'Pohon Tumbang', value: 'PT' },
  { label: 'Pohon Sakit', value: 'PS' },
  { label: 'Pohon Diameter', value: 'PD' },
  { label: 'Pohon Kering', value: 'PK' },
];

/** Pruning action options (Indonesian labels per ADR-031) */
const PRUNING_ACTION_OPTIONS: NBSelectOption[] = [
  { label: 'Pemangkasan Mahkota', value: 'PM' },
  { label: 'Pemangkasan Batang', value: 'PB' },
  { label: 'Pemangkasan Cabang', value: 'PC' },
];

/** Task source options (Indonesian labels per ADR-031) */
const TASK_SOURCE_OPTIONS: NBSelectOption[] = [
  { label: 'Tindak Lanjut Inspeksi', value: 'TIW' },
  { label: 'Temuan Satgas', value: 'TS' },
  { label: 'Call Center', value: 'CC' },
  { label: 'Pesan Warga', value: 'PW' },
  { label: 'Walikota', value: 'Wk' },
];

export function PruningTaskForm({
  onSubmit,
  isLoading = false,
  style,
}: PruningTaskFormProps): React.JSX.Element {
  const [caseType, setCaseType] = useState<CaseType | ''>('');
  const [pruningAction, setPruningAction] = useState<PruningAction | ''>('');
  const [taskSource, setTaskSource] = useState<TaskSource | ''>('');
  const [selectedSpecies, setSelectedSpecies] = useState<PlantSpecies[]>([]);
  const [notes, setNotes] = useState('');

  // Validate form: all required fields filled
  const isValid = useMemo(() => {
    return (
      caseType !== '' &&
      pruningAction !== '' &&
      taskSource !== '' &&
      selectedSpecies.length > 0
    );
  }, [caseType, pruningAction, taskSource, selectedSpecies]);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    if (!isValid) {
      return;
    }

    onSubmit({
      case_type: caseType as CaseType,
      pruning_action: pruningAction as PruningAction,
      source: taskSource as TaskSource,
      species: selectedSpecies,
      notes: notes.trim().length > 0 ? notes : undefined,
    });
  }, [caseType, pruningAction, taskSource, selectedSpecies, notes, onSubmit, isValid]);

  return (
    <ScrollView
      style={[styles.container, style]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Case Type Picker */}
      <View style={styles.field}>
        <NBText variant="body-sm" color="textMuted" style={styles.label}>
          Klasifikasi Kasus *
        </NBText>
        <NBSelect
          options={CASE_TYPE_OPTIONS}
          value={caseType}
          onValueChange={setCaseType}
          placeholder="Pilih klasifikasi..."
          disabled={isLoading}
          accessibilityLabel="Pilih klasifikasi kasus"
        />
      </View>

      {/* Pruning Action Picker */}
      <View style={styles.field}>
        <NBText variant="body-sm" color="textMuted" style={styles.label}>
          Tindakan Pemangkasan *
        </NBText>
        <NBSelect
          options={PRUNING_ACTION_OPTIONS}
          value={pruningAction}
          onValueChange={setPruningAction}
          placeholder="Pilih tindakan..."
          disabled={isLoading}
          accessibilityLabel="Pilih tindakan pemangkasan"
        />
      </View>

      {/* Task Source Picker */}
      <View style={styles.field}>
        <NBText variant="body-sm" color="textMuted" style={styles.label}>
          Sumber Tugas *
        </NBText>
        <NBSelect
          options={TASK_SOURCE_OPTIONS}
          value={taskSource}
          onValueChange={setTaskSource}
          placeholder="Pilih sumber..."
          disabled={isLoading}
          accessibilityLabel="Pilih sumber tugas"
        />
      </View>

      {/* Species Multi-Select */}
      <View style={styles.field}>
        <NBText variant="body-sm" color="textMuted" style={styles.label}>
          Spesies Tanaman *
        </NBText>
        <SpeciesAutocomplete
          selectedSpecies={selectedSpecies}
          onSelectionChange={setSelectedSpecies}
          multiSelect={true}
          placeholder="Cari dan pilih spesies..."
        />
      </View>

      {/* Notes (Optional) */}
      <View style={styles.field}>
        <NBText variant="body-sm" color="textMuted" style={styles.label}>
          Catatan (Opsional)
        </NBText>
        <NBCardTextInput
          placeholder="Tambahkan catatan..."
          value={notes}
          onChangeText={setNotes}
          multiline={true}
          numberOfLines={3}
          disabled={isLoading}
          accessibilityLabel="Catatan tugas pemangkasan"
        />
      </View>

      {/* Submit Button */}
      <NBButton
        label={isLoading ? 'Menyimpan...' : 'Simpan Tugas'}
        onPress={handleSubmit}
        disabled={!isValid || isLoading}
        variant={isValid && !isLoading ? 'primary' : 'secondary'}
        style={styles.submitButton}
        accessibilityLabel="Simpan tugas pemangkasan"
        accessibilityHint={!isValid ? 'Lengkapi semua bidang yang wajib' : undefined}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: nbSpacing.base,
    paddingVertical: nbSpacing.lg,
    gap: nbSpacing.lg,
  },
  field: {
    gap: nbSpacing.sm,
  },
  label: {
    paddingLeft: nbSpacing.xs,
  },
  submitButton: {
    marginTop: nbSpacing.lg,
    marginBottom: nbSpacing.base,
  },
});
