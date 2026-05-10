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
  assignPruningRequestToTask,
  clearError,
} from '../../store/slices/pruningRequestsSlice';
import { fetchCapacity } from '../../store/slices/serviceCapacitySlice';
import { fetchAreas } from '../../store/slices/areasSlice';
import { fetchUsers } from '../../store/slices/usersSlice';
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

interface AssignToTaskSheetProps {
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
export function AssignToTaskSheet({
  visible,
  onClose,
  request,
  onSuccess,
}: AssignToTaskSheetProps): React.JSX.Element {
  const dispatch = useAppDispatch();

  const allAreas = useAppSelector((state) => state.areas.list);
  const allUsers = useAppSelector((state) => state.users.list);
  const { convertingId, error: pruningError } = useAppSelector(
    (state) => state.pruningRequests,
  );
  const { calendarByRayon, loading: _capacityLoading } = useAppSelector(
    (state) => state.serviceCapacity,
  );

  // Scope the pickers to the request's rayon — areas live under a rayon, and
  // assignees should be in-rayon korlap/satgas/linmas. Falls back to the full
  // list if the request has no rayon for some reason.
  const areas = useMemo(
    () => (request.rayonId ? allAreas.filter((a) => a.rayon_id === request.rayonId) : allAreas),
    [allAreas, request.rayonId],
  );
  const users = useMemo(
    () =>
      request.rayonId
        ? allUsers.filter((u) => u.rayon_id === request.rayonId)
        : allUsers,
    [allUsers, request.rayonId],
  );

  // Lazy-load master data the first time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    if (allAreas.length === 0) dispatch(fetchAreas());
    if (allUsers.length === 0) dispatch(fetchUsers());
  }, [visible, allAreas.length, allUsers.length, dispatch]);

  // Form state
  const [areaId, setAreaId] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
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

  // Pruning-eligible assignees per ADR-038: korlap routinely runs the work,
  // satgas/linmas can be the direct hand, kepala_rayon/admin_data may take
  // a task themselves and tag others.
  const assigneeOptions = useMemo(
    () =>
      users
        .filter((u) =>
          ['korlap', 'satgas', 'linmas', 'kepala_rayon', 'admin_data'].includes(u.role),
        )
        .map((u) => ({
          label: `${u.full_name} (${u.role})`,
          value: u.id,
        })),
    [users],
  );

  // Fetch capacity when date changes
  useEffect(() => {
    if (scheduledDate && request.rayonId) {
      const { year, week } = getISOWeek(scheduledDate);
      dispatch(
        fetchCapacity({
          rayonId: request.rayonId,
          year,
          fromWeek: week,
          toWeek: week,
          serviceType: 'pruning',
        }),
      );
    }
  }, [scheduledDate, request.rayonId, dispatch]);

  // Get capacity for selected week
  const weekCapacity = useMemo(() => {
    if (!scheduledDate || !request.rayonId) {
      return null;
    }
    const { year, week } = getISOWeek(scheduledDate);
    const calendar = calendarByRayon[request.rayonId];
    if (!calendar) {
      return null;
    }
    return calendar.find((c) => c.year === year && c.week === week) || null;
  }, [scheduledDate, request.rayonId, calendarByRayon]);

  // Check if capacity exceeded
  const capacityExceeded = useMemo(() => {
    if (!weekCapacity) {
      return false;
    }
    const wc = weekCapacity as any;
    const booked = wc.booked_units ?? wc.bookedUnits ?? 0;
    const cap = wc.capacity_units ?? wc.capacityUnits ?? 0;
    const unitsNum = parseInt(units, 10) || 0;
    return booked + unitsNum > cap;
  }, [weekCapacity, units]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!isFormValid) {
      return;
    }

    const unitsNum = parseInt(units, 10) || 1;

    await dispatch(
      assignPruningRequestToTask({
        id: request.id,
        areaId,
        assignedTo,
        scheduledDate: scheduledDate ? scheduledDate.toISOString() : '',
        caseType,
        pruningAction,
        units: unitsNum,
      }),
    ).unwrap();

    NBToast.show({
      level: 'success',
      title: 'Berhasil',
      body: 'Tugas berhasil dibuat dari permohonan',
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
      title="Tugaskan ke Petugas"
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
            <View style={{ marginBottom: nbSpacing[4] }}>
              <NBAlert
                variant="danger"
                title="Terjadi Kesalahan"
                message={pruningError}
              />
            </View>
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
              onChange={setScheduledDate}
              minimumDate={minDate}
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
                {(weekCapacity as any).booked_units ?? (weekCapacity as any).bookedUnits ?? 0}/{(weekCapacity as any).capacity_units ?? (weekCapacity as any).capacityUnits ?? 0} unit
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
              label="Tugaskan"
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
