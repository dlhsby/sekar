import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { PlantSpecies } from '../../types/models.types';
import { SpeciesAutocomplete } from './SpeciesAutocomplete';
import { NBSelect } from '../nb/NBSelect';
import { NBButton } from '../nb/NBButton';
import { NBAlert } from '../nb/NBAlert';
import { nbColors, nbSpacing, nbBorders, nbType } from '../../constants/generated/tokens';

export type CaseType = 'GT' | 'PT' | 'PS' | 'PD' | 'PK';
export type PruningAction = 'PM' | 'PB' | 'PC';
export type Source = 'TIW' | 'TS' | 'CC' | 'PW' | 'Wk';

export interface SpeciesCount {
  speciesId: string;
  count: number;
}

export interface PruningTaskFormData {
  caseType: CaseType;
  pruningAction: PruningAction;
  source: Source;
  species: SpeciesCount[];
  notes?: string;
  areaId?: string;
}

interface PruningTaskFormProps {
  onSubmit: (data: PruningTaskFormData) => void | Promise<void>;
  initialValues?: Partial<PruningTaskFormData>;
  areaId?: string;
  isLoading?: boolean;
  testID?: string;
}

const CASE_TYPE_OPTIONS: Array<{ label: string; value: CaseType }> = [
  { label: 'Gangguan Tinggi', value: 'GT' },
  { label: 'Pohon Tumbang', value: 'PT' },
  { label: 'Pohon Sakit', value: 'PS' },
  { label: 'Pohon Diameter Besar', value: 'PD' },
  { label: 'Pohon Kering', value: 'PK' },
];

const PRUNING_ACTION_OPTIONS: Array<{ label: string; value: PruningAction }> = [
  { label: 'Pemangkasan Mahkota', value: 'PM' },
  { label: 'Pemangkasan Batang', value: 'PB' },
  { label: 'Pemangkasan Cabang', value: 'PC' },
];

const SOURCE_OPTIONS: Array<{ label: string; value: Source }> = [
  { label: 'Tindak Lanjut Inspeksi', value: 'TIW' },
  { label: 'Temuan Satgas', value: 'TS' },
  { label: 'Call Center', value: 'CC' },
  { label: 'Pesan Warga', value: 'PW' },
  { label: 'Walikota', value: 'Wk' },
];

/**
 * PruningTaskForm component for creating pruning task requests
 * Handles species selection with counts, case type, pruning action, and source
 */
export const PruningTaskForm: React.FC<PruningTaskFormProps> = ({
  onSubmit,
  initialValues,
  areaId,
  isLoading = false,
  testID,
}) => {
  const [caseType, setCaseType] = useState<CaseType | ''>(initialValues?.caseType || '');
  const [pruningAction, setPruningAction] = useState<PruningAction | ''>(initialValues?.pruningAction || '');
  const [source, setSource] = useState<Source | ''>(initialValues?.source || '');
  const [selectedSpecies, setSelectedSpecies] = useState<PlantSpecies[]>(initialValues?.species?.map(sc => ({
    id: sc.speciesId,
    nameId: '',
    nameLatin: null,
    category: 'tree',
    defaultPruningCycleDays: null,
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })) || []);
  const [speciesCounts, setSpeciesCounts] = useState<Record<string, number>>(
    initialValues?.species?.reduce((acc, sc) => ({ ...acc, [sc.speciesId]: sc.count }), {}) || {}
  );
  const [notes, setNotes] = useState(initialValues?.notes || '');
  const [validationError, setValidationError] = useState('');

  const isFormValid = useMemo(() => {
    if (!caseType || !pruningAction || !source) return false;
    if (selectedSpecies.length === 0) return false;
    // All selected species must have a count >= 1
    return selectedSpecies.every((s) => (speciesCounts[s.id] || 0) >= 1);
  }, [caseType, pruningAction, source, selectedSpecies, speciesCounts]);

  const handleSpeciesChange = useCallback((species: PlantSpecies[]) => {
    setSelectedSpecies(species);
    // Remove counts for unselected species
    const newCounts = { ...speciesCounts };
    Object.keys(newCounts).forEach((id) => {
      if (!species.some((s) => s.id === id)) {
        delete newCounts[id];
      }
    });
    setSpeciesCounts(newCounts);
  }, [speciesCounts]);

  const handleCountChange = useCallback(
    (speciesId: string, value: string) => {
      const count = Math.max(1, parseInt(value, 10) || 1);
      setSpeciesCounts((prev) => ({
        ...prev,
        [speciesId]: count,
      }));
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    setValidationError('');

    // Validate form
    if (!caseType) {
      setValidationError('Jenis gangguan harus dipilih');
      return;
    }
    if (!pruningAction) {
      setValidationError('Jenis pemangkasan harus dipilih');
      return;
    }
    if (!source) {
      setValidationError('Sumber pengajuan harus dipilih');
      return;
    }
    if (selectedSpecies.length === 0) {
      setValidationError('Minimal satu spesies tanaman harus dipilih');
      return;
    }

    // Build species array with counts
    const speciesArray: SpeciesCount[] = selectedSpecies
      .map((s) => ({
        speciesId: s.id,
        count: speciesCounts[s.id] || 1,
      }))
      .filter((item) => item.count >= 1);

    if (speciesArray.length === 0) {
      setValidationError('Semua spesies tanaman harus memiliki jumlah minimal 1');
      return;
    }

    try {
      await onSubmit({
        caseType: caseType as CaseType,
        pruningAction: pruningAction as PruningAction,
        source: source as Source,
        species: speciesArray,
        notes: notes.trim() || undefined,
        areaId,
      });
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : 'Terjadi kesalahan saat menyimpan data'
      );
    }
  }, [caseType, pruningAction, source, selectedSpecies, speciesCounts, notes, areaId, onSubmit]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Validation Error Alert */}
        {validationError && (
          <NBAlert
            type="error"
            title="Validasi Gagal"
            message={validationError}
            style={styles.alert}
            testID={`${testID}-error`}
          />
        )}

        {/* Case Type Picker */}
        <View style={styles.section}>
          <Text style={styles.label}>Jenis Gangguan *</Text>
          <NBSelect
            options={CASE_TYPE_OPTIONS}
            value={caseType}
            onValueChange={(value) => {
              setCaseType(value as CaseType);
              setValidationError('');
            }}
            placeholder="Pilih jenis gangguan"
            testID={`${testID}-case-type`}
            accessibilityLabel="Jenis gangguan"
          />
        </View>

        {/* Pruning Action Picker */}
        <View style={styles.section}>
          <Text style={styles.label}>Jenis Pemangkasan *</Text>
          <NBSelect
            options={PRUNING_ACTION_OPTIONS}
            value={pruningAction}
            onValueChange={(value) => {
              setPruningAction(value as PruningAction);
              setValidationError('');
            }}
            placeholder="Pilih jenis pemangkasan"
            testID={`${testID}-pruning-action`}
            accessibilityLabel="Jenis pemangkasan"
          />
        </View>

        {/* Source Picker */}
        <View style={styles.section}>
          <Text style={styles.label}>Sumber Pengajuan *</Text>
          <NBSelect
            options={SOURCE_OPTIONS}
            value={source}
            onValueChange={(value) => {
              setSource(value as Source);
              setValidationError('');
            }}
            placeholder="Pilih sumber pengajuan"
            testID={`${testID}-source`}
            accessibilityLabel="Sumber pengajuan"
          />
        </View>

        {/* Species Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Spesies Tanaman *</Text>
          <SpeciesAutocomplete
            multi={true}
            value={selectedSpecies}
            onChange={handleSpeciesChange}
            areaId={areaId}
            testID={`${testID}-species`}
          />
        </View>

        {/* Species Counts */}
        {selectedSpecies.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Jumlah per Spesies</Text>
            {selectedSpecies.map((species) => (
              <View key={species.id} style={styles.countRow}>
                <Text style={styles.countLabel}>{species.nameId}</Text>
                <TextInput
                  style={styles.countInput}
                  keyboardType="numeric"
                  placeholder="1"
                  value={String(speciesCounts[species.id] || 1)}
                  onChangeText={(value) => handleCountChange(species.id, value)}
                  editable={!isLoading}
                  accessibilityLabel={`Jumlah ${species.nameId}`}
                  testID={`${testID}-count-${species.id}`}
                />
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>Catatan Tambahan (Opsional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Tambahkan catatan..."
            placeholderTextColor={nbColors.gray5}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            editable={!isLoading}
            accessibilityLabel="Catatan tambahan"
            accessibilityHint="Ruang bebas untuk catatan tambahan"
            testID={`${testID}-notes`}
          />
        </View>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <NBButton
            title="Kirim Pengajuan"
            onPress={handleSubmit}
            disabled={!isFormValid || isLoading}
            loading={isLoading}
            testID={`${testID}-submit`}
            accessibilityLabel="Kirim pengajuan"
            accessibilityHint={!isFormValid ? 'Lengkapi semua bidang yang diperlukan' : undefined}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: nbColors.bgCanvas,
  },
  scrollView: {
    padding: nbSpacing.md,
  },
  alert: {
    marginBottom: nbSpacing.md,
  },
  section: {
    marginBottom: nbSpacing.lg,
  },
  label: {
    fontSize: 14,
    fontFamily: nbType.body.fontFamily,
    fontWeight: '600',
    color: nbColors.text,
    marginBottom: nbSpacing.sm,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: nbColors.border,
  },
  countLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: nbType.body.fontFamily,
    color: nbColors.text,
  },
  countInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: nbColors.border,
    borderRadius: parseInt(nbBorders.radiusSm as string),
    paddingHorizontal: nbSpacing.sm,
    fontSize: 14,
    fontFamily: nbType.body.fontFamily,
    color: nbColors.text,
    textAlign: 'center',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: nbColors.border,
    borderRadius: parseInt(nbBorders.radiusSm as string),
    padding: nbSpacing.sm,
    fontSize: 14,
    fontFamily: nbType.body.fontFamily,
    color: nbColors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    marginTop: nbSpacing.lg,
    marginBottom: nbSpacing.xl,
  },
});
