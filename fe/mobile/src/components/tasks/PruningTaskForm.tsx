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
import { useTranslation } from 'react-i18next';
import { PlantSpecies } from '../../types/models.types';
import { SpeciesAutocomplete } from './SpeciesAutocomplete';
import { NBSelect } from '../nb/NBSelect';
import { NBButton } from '../nb/NBButton';
import { NBAlert } from '../nb/NBAlert';
import { nbColors, nbSpacing, nbType, nbRadius } from '../../constants/generated/tokens';

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

const getCaseTypeOptions = (t: ReturnType<typeof useTranslation>['t']) => [
  { label: t('pruning:taskForm.caseTypeOptions.GT'), value: 'GT' as CaseType },
  { label: t('pruning:taskForm.caseTypeOptions.PT'), value: 'PT' as CaseType },
  { label: t('pruning:taskForm.caseTypeOptions.PS'), value: 'PS' as CaseType },
  { label: t('pruning:taskForm.caseTypeOptions.PD'), value: 'PD' as CaseType },
  { label: t('pruning:taskForm.caseTypeOptions.PK'), value: 'PK' as CaseType },
];

const getPruningActionOptions = (t: ReturnType<typeof useTranslation>['t']) => [
  { label: t('pruning:taskForm.pruningActionOptions.PM'), value: 'PM' as PruningAction },
  { label: t('pruning:taskForm.pruningActionOptions.PB'), value: 'PB' as PruningAction },
  { label: t('pruning:taskForm.pruningActionOptions.PC'), value: 'PC' as PruningAction },
];

const getSourceOptions = (t: ReturnType<typeof useTranslation>['t']) => [
  { label: t('pruning:taskForm.sourceOptions.TIW'), value: 'TIW' as Source },
  { label: t('pruning:taskForm.sourceOptions.TS'), value: 'TS' as Source },
  { label: t('pruning:taskForm.sourceOptions.CC'), value: 'CC' as Source },
  { label: t('pruning:taskForm.sourceOptions.PW'), value: 'PW' as Source },
  { label: t('pruning:taskForm.sourceOptions.Wk'), value: 'Wk' as Source },
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
  const { t } = useTranslation();
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
      setValidationError(t('pruning:taskForm.validationErrors.caseTypeRequired'));
      return;
    }
    if (!pruningAction) {
      setValidationError(t('pruning:taskForm.validationErrors.pruningActionRequired'));
      return;
    }
    if (!source) {
      setValidationError(t('pruning:taskForm.validationErrors.sourceRequired'));
      return;
    }
    if (selectedSpecies.length === 0) {
      setValidationError(t('pruning:taskForm.validationErrors.speciesRequired'));
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
      setValidationError(t('pruning:taskForm.validationErrors.speciesCountRequired'));
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
        error instanceof Error ? error.message : t('pruning:taskForm.validationErrors.saveFailed')
      );
    }
  }, [caseType, pruningAction, source, selectedSpecies, speciesCounts, notes, areaId, onSubmit, t]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Validation Error Alert */}
        {validationError && (
          <NBAlert
            variant="danger"
            title={t('pruning:taskForm.validationFailedTitle')}
            message={validationError}
          />
        )}

        {/* Case Type Picker */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('pruning:taskForm.caseTypeLabel')}</Text>
          <NBSelect
            options={getCaseTypeOptions(t)}
            value={caseType}
            onValueChange={(value) => {
              setCaseType(value as CaseType);
              setValidationError('');
            }}
            placeholder={t('pruning:taskForm.caseTypePlaceholder')}
          />
        </View>

        {/* Pruning Action Picker */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('pruning:taskForm.pruningActionLabel')}</Text>
          <NBSelect
            options={getPruningActionOptions(t)}
            value={pruningAction}
            onValueChange={(value) => {
              setPruningAction(value as PruningAction);
              setValidationError('');
            }}
            placeholder={t('pruning:taskForm.pruningActionPlaceholder')}
          />
        </View>

        {/* Source Picker */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('pruning:taskForm.sourceLabel')}</Text>
          <NBSelect
            options={getSourceOptions(t)}
            value={source}
            onValueChange={(value) => {
              setSource(value as Source);
              setValidationError('');
            }}
            placeholder={t('pruning:taskForm.sourcePlaceholder')}
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
            placeholderTextColor={nbColors.gray50}
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
    color: nbColors.black,
    marginBottom: nbSpacing.sm,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: nbColors.gray300,
  },
  countLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: nbType.body.fontFamily,
    color: nbColors.black,
  },
  countInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: nbColors.gray300,
    borderRadius: nbRadius.sm,
    paddingHorizontal: nbSpacing.sm,
    fontSize: 14,
    fontFamily: nbType.body.fontFamily,
    color: nbColors.black,
    textAlign: 'center',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: nbColors.gray300,
    borderRadius: nbRadius.sm,
    padding: nbSpacing.sm,
    fontSize: 14,
    fontFamily: nbType.body.fontFamily,
    color: nbColors.black,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    marginTop: nbSpacing.lg,
    marginBottom: nbSpacing.xl,
  },
});
