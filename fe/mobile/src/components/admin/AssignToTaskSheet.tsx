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
import { fetchUsers } from '../../store/slices/usersSlice';
import {
  NBModal,
  NBButton,
  NBSelect,
  NBAlert,
} from '../../components/nb';
import { NBText } from '../../components/nb/NBText';
import { nbColors, nbSpacing, nbBorders, nbBorderRadius } from '../../constants/nbTokens';
import { NBToast } from '../../components/nb/NBToast';
import type { PruningRequest } from '../../types/models.types';
import { formatDateLong, getISOWeek } from '../../utils/dateUtils';

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

  const allUsers = useAppSelector((state) => state.users.list);
  const { convertingId, error: pruningError } = useAppSelector(
    (state) => state.pruningRequests,
  );
  const { calendarByRayon, loading: _capacityLoading } = useAppSelector(
    (state) => state.serviceCapacity,
  );

  // Scope the assignee picker to the request's rayon (May 11, 2026 — area
  // picker removed since pruning happens outside managed areas). Falls back
  // to the full list if the request has no rayon for some reason.
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
    if (allUsers.length === 0) dispatch(fetchUsers());
  }, [visible, allUsers.length, dispatch]);

  // Form state. May 11, 2026:
  //   - `areaId` removed from the UI — pruning runs in neighborhoods /
  //     private yards, not managed areas. Backend now treats `area_id`
  //     as optional.
  //   - `scheduledDate` pre-fills from `request.scheduledDate` (the date
  //     admin already set via Atur Jadwal before approve). The field is
  //     read-only here; to change it, admin uses Atur Ulang Jadwal which
  //     cascades to task.deadline + capacity rebook.
  //   - `units` defaults to 1 and is no longer surfaced in the form —
  //     capacity is "permohonan slots" (not tree count), and tree count
  //     itself lives on `request.treeCount`.
  const [assignedTo, setAssignedTo] = useState<string>('');
  const scheduledDate = useMemo<Date | null>(
    () => (request.scheduledDate ? new Date(request.scheduledDate) : null),
    [request.scheduledDate],
  );
  const [caseType, setCaseType] = useState<CaseType>('PT');
  const [pruningAction, setPruningAction] = useState<PruningAction>('PM');

  // Validation state
  const isFormValid = useMemo(
    () => Boolean(assignedTo && scheduledDate && caseType && pruningAction),
    [assignedTo, scheduledDate, caseType, pruningAction],
  );

  // Pruning-eligible assignees: anyone in the rayon who can field-execute
  // or take responsibility — kepala_rayon, admin_data (including the
  // current admin themselves, for centralized-report patterns), korlap,
  // satgas, linmas. Per ADR-038 + user clarification May 11, 2026.
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
    // Pruning always books 1 unit per permohonan (May 11, 2026 — units
    // field was removed from the form). Capacity is "permohonan slots",
    // not tree count.
    return booked + 1 > cap;
  }, [weekCapacity]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!isFormValid) {
      return;
    }

    await dispatch(
      assignPruningRequestToTask({
        id: request.id,
        // areaId intentionally omitted — pruning isn't tied to a managed area.
        // units defaults to 1 server-side; capacity is per-permohonan.
        assignedTo,
        scheduledDate: scheduledDate ? scheduledDate.toISOString() : '',
        caseType,
        pruningAction,
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
    assignedTo,
    scheduledDate,
    caseType,
    pruningAction,
    dispatch,
    onClose,
    onSuccess,
  ]);

  const handleClose = useCallback(() => {
    dispatch(clearError());
    onClose();
  }, [dispatch, onClose]);

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

          {/* Scheduled Date — read-only. Pre-filled from request.scheduledDate
              (set by admin via Atur Jadwal before approve). To change, admin
              uses Atur Ulang Jadwal which cascades correctly post-assign. */}
          <View style={styles.field}>
            <NBText variant="body-sm" style={{ marginBottom: nbSpacing[2] }}>
              Tanggal Penjadwalan
            </NBText>
            <View style={styles.readOnlyChip}>
              <NBText
                variant="body"
                style={{ fontWeight: '700', color: nbColors.black }}
              >
                {scheduledDate
                  ? formatDateLong(scheduledDate)
                  : 'Belum dijadwalkan'}
              </NBText>
            </View>
            <NBText
              variant="caption"
              style={{ color: nbColors.gray700, marginTop: nbSpacing[1] }}
            >
              Untuk mengubah, gunakan "Atur Ulang Jadwal" setelah penugasan.
            </NBText>
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
  readOnlyChip: {
    paddingVertical: nbSpacing[3],
    paddingHorizontal: nbSpacing[3],
    borderWidth: nbBorders.thin,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.sm,
    backgroundColor: nbColors.gray100,
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
