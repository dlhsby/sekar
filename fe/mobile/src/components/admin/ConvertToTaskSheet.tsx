/**
 * Convert to Task Sheet
 * Modal form for converting pruning requests to tasks
 * Phase 3 sub-phase 3-10
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  convertPruningRequestToTask,
  clearError,
} from '../../store/slices/pruningRequestsSlice';
import { fetchCapacity } from '../../store/slices/serviceCapacitySlice';
import {
  NBModal,
  NBButton,
  NBSelect,
  NBTextInput,
  NBDatePicker,
  NBAlert,
} from '../../components/nb';
import { NBText } from '../../components/nb/NBText';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import { NBToast } from '../../components/nb/NBToast';
import type { PruningRequest } from '../../types/models.types';
import { getISOWeek } from '../../utils/dateUtils';

interface ConvertToTaskSheetProps {
  visible: boolean;
  onClose: () => void;
  request: PruningRequest;
  onSuccess?: () => void;
}

type CaseType = 'GT' | 'PT' | 'PS' | 'PD' | 'PK';
type PruningAction = 'PM' | 'PB' | 'PC';

const CASE_TYPES: { label: string; value: CaseType }[] = [
  { label: 'Gawat Darurat', value: 'GT' },
  { label: 'Pemeliharaan Teratur', value: 'PT' },
  { label: 'Pemeliharaan Khusus', value: 'PS' },
  { label: 'Pembersihan Dahan', value: 'PD' },
  { label: 'Pemangkasan Khusus', value: 'PK' },
];

const PRUNING_ACTIONS: { label: string; value: PruningAction }[] = [
  { label: 'Pemangkasan Moderat', value: 'PM' },
  { label: 'Pemangkasan Berat', value: 'PB' },
  { label: 'Pemangkasan Cabang', value: 'PC' },
];

/**
 * Convert to Task Sheet Component
 */
export function ConvertToTaskSheet({
  visible,
  onClose,
  request,
  onSuccess,
}: ConvertToTaskSheetProps): React.JSX.Element {
  const dispatch = useAppDispatch();

  // Get areas and users from Redux
  const areas = useAppSelector((state) => state.areas.items || []);
  const users = useAppSelector((state) => state.users.items || []);
  const { convertingId, error: pruningError } = useAppSelector(
    (state) => state.pruningRequests,
  );
  const { calendarByRayon, loading: capacityLoading } = useAppSelector(
    (state) => state.serviceCapacity,
  );

  // Form state
  const [areaId, setAreaId] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [caseType, setCaseType] = useState<CaseType>('PT');
  const [pruningAction, setPruningAction] = useState<PruningAction>('PM');
  const [units, setUnits] = useState<string>('1');

  // Validation state
  const isFormValid = useMemo(
    () => areaId && assignedTo && scheduledDate && caseType && pruningAction,
    [areaId, assignedTo, scheduledDate, caseType, pruningAction],
  );

  // Get area list
  const areaOptions = useMemo(
    () =>
      areas.map((a) => ({
        label: a.name,
        value: a.id,
      })),
    [areas],
  );

  // Get korlap/supervisor users for assignment
  const assigneeOptions = useMemo(
    () =>
      users
        .filter((u) => ['korlap', 'kepala_rayon'].includes(u.role))
        .map((u) => ({
          label: u.full_name,
          value: u.id,
        })),
    [users],
  );

  // Fetch capacity when date changes
  useEffect(() => {
    if (scheduledDate && request.rayon_id) {
      const { year, week } = getISOWeek(new Date(scheduledDate));
      dispatch(
        fetchCapacity({
          rayonId: request.rayon_id,
          year,
          fromWeek: week,
          toWeek: week,
          serviceType: 'pruning',
        }),
      );
    }
  }, [scheduledDate, request.rayon_id, dispatch]);

  // Get capacity for selected week
  const weekCapacity = useMemo(() => {
    if (!scheduledDate || !request.rayon_id) {
      return null;
    }
    const { year, week } = getISOWeek(new Date(scheduledDate));
    const calendar = calendarByRayon[request.rayon_id];
    if (!calendar) {
      return null;
    }
    return calendar.find((c) => c.year === year && c.week === week) || null;
  }, [scheduledDate, request.rayon_id, calendarByRayon]);

  // Check if capacity exceeded
  const capacityExceeded = useMemo(() => {
    if (!weekCapacity) {
      return false;
    }
    const unitsNum = parseInt(units, 10) || 0;
    return weekCapacity.booked_units + unitsNum > weekCapacity.capacity_units;
  }, [weekCapacity, units]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!isFormValid) {
      return;
    }

    const unitsNum = parseInt(units, 10) || 1;

    await dispatch(
      convertPruningRequestToTask({
        id: request.id,
        areaId,
        assignedTo,
        scheduledDate,
        caseType,
        pruningAction,
        units: unitsNum,
      }),
    ).unwrap();

    NBToast.show({
      level: 'success',
      title: 'Berhasil',
      message: 'Tugas berhasil dibuat dari permohonan',
    });

    onClose();
    if (onSuccess) {
      onSuccess();
    }
  }, [
    isFormValid,
    request.id,
    areaId,
    assignedTo,
    scheduledDate,
    caseType,
    pruningAction,
    units,
    dispatch,
    onClose,
    onSuccess,
  ]);

  const handleClose = useCallback(() => {
    dispatch(clearError());
    onClose();
  }, [dispatch, onClose]);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);

  return (
    <NBModal
      visible={visible}
      onClose={handleClose}
      title="Konversi ke Tugas"
      type="sheet"
      size="lg"
      scrollable={true}
      avoidKeyboard={true}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {pruningError && (
            <NBAlert
              type="error"
              title="Terjadi Kesalahan"
              message={pruningError}
              style={{ marginBottom: nbSpacing[4] }}
            />
          )}

          {/* Area Selection */}
          <View style={styles.field}>
            <NBText variant="body-sm" style={{ marginBottom: nbSpacing[2] }}>
              Area
            </NBText>
            <NBSelect
              value={areaId}
              onValueChange={setAreaId}
              options={areaOptions}
              placeholder="Pilih area"
              testID="convert-area-select"
            />
          </View>

          {/* Assigned To */}
          <View style={styles.field}>
            <NBText variant="body-sm" style={{ marginBottom: nbSpacing[2] }}>
              Ditugaskan Ke
            </NBText>
            <NBSelect
              value={assignedTo}
              onValueChange={setAssignedTo}
              options={assigneeOptions}
              placeholder="Pilih pengguna"
              testID="convert-assignee-select"
            />
          </View>

          {/* Case Type */}
          <View style={styles.field}>
            <NBText variant="body-sm" style={{ marginBottom: nbSpacing[2] }}>
              Tipe Kasus
            </NBText>
            <NBSelect
              value={caseType}
              onValueChange={(v) => setCaseType(v as CaseType)}
              options={CASE_TYPES}
              testID="convert-casetype-select"
            />
          </View>

          {/* Pruning Action */}
          <View style={styles.field}>
            <NBText variant="body-sm" style={{ marginBottom: nbSpacing[2] }}>
              Aksi Pemangkasan
            </NBText>
            <NBSelect
              value={pruningAction}
              onValueChange={(v) => setPruningAction(v as PruningAction)}
              options={PRUNING_ACTIONS}
              testID="convert-action-select"
            />
          </View>

          {/* Scheduled Date */}
          <View style={styles.field}>
            <NBText variant="body-sm" style={{ marginBottom: nbSpacing[2] }}>
              Tanggal Penjadwalan
            </NBText>
            <NBDatePicker
              value={scheduledDate}
              onDateChange={setScheduledDate}
              minimumDate={minDate}
              testID="convert-date-picker"
            />
          </View>

          {/* Capacity Info */}
          {weekCapacity && (
            <View
              style={[
                styles.capacityBox,
                capacityExceeded && styles.capacityBoxExceeded,
              ]}
            >
              <NBText variant="body-sm" style={{ marginBottom: nbSpacing[2] }}>
                Kapasitas minggu ini:
              </NBText>
              <NBText
                variant="body"
                style={{
                  fontWeight: '600',
                  color: capacityExceeded ? nbColors.danger : nbColors.black,
                }}
              >
                {weekCapacity.booked_units}/{weekCapacity.capacity_units} unit
                {capacityExceeded && ' (Melebihi kapasitas)'}
              </NBText>
            </View>
          )}

          {/* Units */}
          <View style={styles.field}>
            <NBText variant="body-sm" style={{ marginBottom: nbSpacing[2] }}>
              Jumlah Unit
            </NBText>
            <NBTextInput
              value={units}
              onChangeText={setUnits}
              placeholder="Masukkan jumlah unit"
              keyboardType="number-pad"
              testID="convert-units-input"
            />
          </View>

          {/* Buttons */}
          <View style={styles.buttonGroup}>
            <NBButton
              variant="primary"
              label="Konversi"
              onPress={handleSubmit}
              disabled={!isFormValid || capacityExceeded || convertingId === request.id}
              loading={convertingId === request.id}
              testID="convert-submit-btn"
            />
            <NBButton
              variant="secondary"
              label="Batal"
              onPress={handleClose}
              disabled={convertingId === request.id}
              testID="convert-cancel-btn"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </NBModal>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: nbSpacing[4],
    paddingTop: nbSpacing[4],
    paddingBottom: nbSpacing[6],
  },
  field: {
    marginBottom: nbSpacing[4],
  },
  capacityBox: {
    padding: nbSpacing[3],
    borderWidth: 2,
    borderColor: nbColors.black,
    borderRadius: 0,
    backgroundColor: nbColors.bgSurface,
    marginBottom: nbSpacing[4],
  },
  capacityBoxExceeded: {
    backgroundColor: '#fff3cd',
    borderColor: nbColors.danger,
  },
  buttonGroup: {
    gap: nbSpacing[3],
  },
});
