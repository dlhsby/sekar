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
import { useTranslation } from 'react-i18next';
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
import { nbColors, nbSpacing, nbBorders, nbRadius } from '../../constants/nbTokens';
import { NBToast } from '../../components/nb/NBToast';
import type { PruningRequest } from '../../types/models.types';
import { formatDateLong, getISOWeek } from '../../utils/dateUtils';

// Assignable roles ordered top-down by org hierarchy (Kepala Rayon → Linmas).
// Default selection is intentionally Admin Data (not the first item) — admin_data
// is the common "Tugaskan" flow.
const ASSIGNABLE_ROLES = [
  'kepala_rayon',
  'admin_data',
  'korlap',
  'satgas',
  'linmas',
] as const;

type AssignableRole = typeof ASSIGNABLE_ROLES[number];

// Role labels are dynamically loaded from i18n in the component (see getRoleLabel below)

interface AssignToTaskSheetProps {
  visible: boolean;
  onClose: () => void;
  request: PruningRequest;
  onSuccess?: () => void;
}

/**
 * Convert to Task Sheet Component
 */
export function AssignToTaskSheet({
  visible,
  onClose,
  request,
  onSuccess,
}: AssignToTaskSheetProps): React.JSX.Element {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  const allUsers = useAppSelector((state) => state.users.list);
  // Optional chain — some test stores omit the auth slice; defaulting to
  // null means "no centralized default assignee" rather than a crash.
  const currentUser = useAppSelector((state) => state.auth?.user ?? null);
  const { convertingId, error: pruningError } = useAppSelector(
    (state) => state.pruningRequests,
  );
  const { calendarByRayon } = useAppSelector(
    (state) => state.serviceCapacity,
  );

  // Scope the assignee picker to the request's rayon (May 11, 2026 — area
  // picker removed since pruning happens outside managed areas).
  // May 12 late+2 — removed the cross-rayon fallback. Every request is
  // submitted by a staff_kecamatan whose rayon is derived from the
  // kecamatans table (NOT NULL FK), so request.rayonId should always be
  // populated. If it isn't, the data is corrupt — fail closed (empty
  // list) rather than open (every user in every rayon).
  const users = useMemo(
    () =>
      request.rayonId
        ? allUsers.filter((u) => u.rayon_id === request.rayonId)
        : [],
    [allUsers, request.rayonId],
  );

  // Lazy-load master data the first time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    if (allUsers.length === 0) dispatch(fetchUsers());
  }, [visible, allUsers.length, dispatch]);

  // Form state. May 11, 2026 (late+1):
  //   - `areaId` removed — pruning runs in neighborhoods / private yards.
  //   - `caseType` + `pruningAction` removed — not needed at assignment;
  //     the satgas captures these on the eventual activity report.
  //   - Two-step assignee picker: role first (default `admin_data`), then
  //     person filtered by selected role (default = the current admin
  //     themselves — supports the centralized-recap pattern where
  //     admin_data takes ownership and tags satgas on the activity later).
  //   - `scheduledDate` pre-fills from `request.scheduledDate` (set by
  //     admin via Atur Jadwal pre-approve). Read-only here; to change,
  //     use Atur Ulang Jadwal which cascades to task.deadline + capacity.
  //   - `units` defaults to 1 server-side (capacity = permohonan slots).
  const [assignedRole, setAssignedRole] = useState<AssignableRole>('admin_data');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const scheduledDate = useMemo<Date | null>(
    () => (request.scheduledDate ? new Date(request.scheduledDate) : null),
    [request.scheduledDate],
  );

  // Default the assignee to the current admin themselves when their role
  // matches the selected role (typical case: admin_data assigning to
  // self). When the role filter changes and the current admin doesn't
  // qualify, clear the selection so the placeholder prompts a pick.
  useEffect(() => {
    if (!visible || !currentUser) return;
    if (currentUser.role === assignedRole) {
      setAssignedTo(currentUser.id);
    } else {
      setAssignedTo('');
    }
  }, [visible, assignedRole, currentUser]);

  // Validation state
  const isFormValid = useMemo(
    () => Boolean(assignedTo && scheduledDate),
    [assignedTo, scheduledDate],
  );

  // Pruning-eligible assignees: anyone in the rayon who can field-execute
  // or take responsibility. Two-step picker (role → person) — the second
  // dropdown is filtered by `assignedRole` so admins see a short, scoped
  // list instead of hunting through every user in the rayon.
  const roleOptions = useMemo(
    () =>
      ASSIGNABLE_ROLES.map((r) => ({
        label: t(`roles:${r}`),
        value: r,
      })),
    [t],
  );
  const assigneeOptions = useMemo(
    () =>
      users
        .filter((u) => u.role === assignedRole)
        .map((u) => ({
          label: u.full_name,
          value: u.id,
        })),
    [users, assignedRole],
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

  // Handle submit. Wrap in try/catch so a server-side 409 (capacity full,
  // wrong status, etc.) or 4xx (validation) shows a danger toast instead
  // of silently bubbling up — the previous form left the user staring at
  // an open modal with no feedback when the API rejected.
  const handleSubmit = useCallback(async () => {
    if (!isFormValid) {
      return;
    }
    try {
      await dispatch(
        assignPruningRequestToTask({
          id: request.id,
          // areaId, caseType, pruningAction, units intentionally omitted —
          // pruning isn't tied to a managed area, capacity is per-permohonan
          // (units=1 server-side), and the case classification + action type
          // are captured by the satgas on the activity report, not here.
          assignedTo,
          scheduledDate: scheduledDate ? scheduledDate.toISOString() : '',
        }),
      ).unwrap();

      NBToast.show({
        level: 'success',
        title: t('tasks:assignToTask.success'),
        body: t('tasks:assignToTask.successMessage'),
      });

      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      // The thunk returns either a string (legacy) or `{ error, code }`.
      // Surface whichever shape we get without crashing on either.
      const message =
        typeof err === 'string'
          ? err
          : (err as { error?: string; message?: string })?.error ??
            (err as { message?: string })?.message ??
            t('tasks:assignToTask.failMessage');
      NBToast.show({
        level: 'danger',
        title: t('tasks:assignToTask.failTitle'),
        body: message,
      });
    }
  }, [
    isFormValid,
    request.id,
    assignedTo,
    scheduledDate,
    dispatch,
    onClose,
    onSuccess,
    t,
  ]);

  const handleClose = useCallback(() => {
    dispatch(clearError());
    onClose();
  }, [dispatch, onClose]);

  return (
    <NBModal
      visible={visible}
      onClose={handleClose}
      title={t('tasks:assignToTask.title')}
      type="sheet"
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
                title={t('tasks:assignToTask.error')}
                message={pruningError}
              />
            </View>
          )}

          {/* Ditugaskan Ke — two-step picker (role → person). Both
              dropdowns are searchable; the person list re-filters whenever
              the role changes. Role defaults to admin_data; the person
              defaults to the current admin themselves when their role
              matches (centralized-recap pattern), otherwise the dropdown
              starts unselected. */}
          <View style={styles.field}>
            <NBText variant="body-sm" style={{ marginBottom: nbSpacing[2] }}>
              {t('tasks:assignToTask.roleLabel')}
            </NBText>
            <NBSelect
              value={assignedRole}
              onValueChange={(v) => setAssignedRole(v as AssignableRole)}
              options={roleOptions}
              placeholder={t('tasks:assignToTask.rolePlaceholder')}
              searchable
            />
          </View>
          <View style={styles.field}>
            <NBText variant="body-sm" style={{ marginBottom: nbSpacing[2] }}>
              {t('tasks:assignToTask.assigneeLabel')}
            </NBText>
            <NBSelect
              value={assignedTo}
              onValueChange={setAssignedTo}
              options={assigneeOptions}
              placeholder={
                assigneeOptions.length === 0
                  ? t('tasks:assignToTask.noAssignees', { role: t(`roles:${assignedRole}`) })
                  : t('tasks:assignToTask.assigneePlaceholder')
              }
              searchable
            />
          </View>

          {/* Scheduled Date — read-only. Pre-filled from request.scheduledDate
              (set by admin via Atur Jadwal before approve). To change, admin
              uses Atur Ulang Jadwal which cascades correctly post-assign. */}
          <View style={styles.field}>
            <NBText variant="body-sm" style={{ marginBottom: nbSpacing[2] }}>
              {t('tasks:assignToTask.dateLabel')}
            </NBText>
            <View style={styles.readOnlyChip}>
              <NBText
                variant="body"
                style={{ fontWeight: '700', color: nbColors.black }}
              >
                {scheduledDate
                  ? formatDateLong(scheduledDate)
                  : t('tasks:assignToTask.notScheduled')}
              </NBText>
            </View>
            <NBText
              variant="caption"
              style={{ color: nbColors.gray700, marginTop: nbSpacing[1] }}
            >
              {t('tasks:assignToTask.dateHint')}
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
                {t('tasks:assignToTask.capacityLabel')}
              </NBText>
              <NBText
                variant="body"
                style={{
                  fontWeight: '600',
                  color: capacityExceeded ? nbColors.danger : nbColors.black,
                }}
              >
                {(weekCapacity as any).booked_units ?? (weekCapacity as any).bookedUnits ?? 0}/{(weekCapacity as any).capacity_units ?? (weekCapacity as any).capacityUnits ?? 0}{t('tasks:assignToTask.unit')}
                {capacityExceeded && t('tasks:assignToTask.capacityExceeded')}
              </NBText>
            </View>
          )}

          {/* Buttons — side-by-side, matches the Buat Permohonan footer
              pattern (Batal left, primary action right). Wrapped in flex:1
              halves so each button gets ~50% of the row width. */}
          <View style={styles.buttonGroup}>
            <View style={{ flex: 1 }}>
              <NBButton
                variant="secondary"
                label={t('common:actions.cancel')}
                onPress={handleClose}
                disabled={convertingId === request.id}
                size="lg"
                fullWidth
                testID="convert-cancel-btn"
              />
            </View>
            <View style={{ flex: 1 }}>
              <NBButton
                variant="primary"
                label={t('tasks:assignToTask.assignButton')}
                onPress={handleSubmit}
                disabled={!isFormValid || capacityExceeded || convertingId === request.id}
                loading={convertingId === request.id}
                size="lg"
                fullWidth
                testID="convert-submit-btn"
              />
            </View>
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
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.black,
    borderRadius: nbRadius.sm,
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
    // Audit H7: was '#fff3cd' (Bootstrap warning bg). Closest NB token is
    // `statusIdleBg` (#FEF3C7) — same pale-warning tonality. Border keeps
    // the danger red for the over-capacity emphasis.
    backgroundColor: nbColors.statusIdleBg,
    borderColor: nbColors.danger,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: nbSpacing[3],
  },
});
