/**
 * TaskFilterModal Component
 * Bottom sheet modal for filtering tasks with role-based access controls
 * Includes: Status, Date Range (native date picker), Rayon, Area, Tipe filters
 * Phase 2C: Uses NBDatePicker for date selection
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { NBSelect, NBDatePicker, NBModal } from '../nb';
import {
  nbColors,
  nbSpacing,
  nbType,
  nbBorders,
} from '../../constants/nbTokens';
import type { TaskStatus, UserRole, Rayon, Area, User } from '../../types/models.types';
import { getRayons, getAreasByRayonId, getAreas, getUsers } from '../../services/api';
import { FILTER_SUBORDINATE_ROLES, TASK_CREATORS } from '../../constants/roles';
import { parseFilterDate, toFilterDateString, toTitleCase } from '../../utils/filterHelpers';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskFilterModalProps {
  visible: boolean;
  onClose: () => void;
  taskFilter: 'all' | 'assigned' | 'tagged' | 'created_by_me';
  statusFilter: TaskStatus | 'all';
  dateFrom: string; // YYYY-MM-DD (deadline from)
  dateTo: string; // YYYY-MM-DD (deadline to)
  createdFrom: string; // YYYY-MM-DD (created_at from)
  createdTo: string; // YYYY-MM-DD (created_at to)
  rayonFilter: string | null;
  areaFilter: string | null;
  petugasFilter: string | null;
  onApplyFilters: (filters: {
    taskFilter: 'all' | 'assigned' | 'tagged' | 'created_by_me';
    statusFilter: TaskStatus | 'all';
    dateFrom: string;
    dateTo: string;
    createdFrom: string;
    createdTo: string;
    rayonFilter: string | null;
    areaFilter: string | null;
    petugasFilter: string | null;
  }) => void;
  onResetFilters: () => void;
  userRole: UserRole;
  userRayonId?: string;
  userAreaId?: string;
  userId?: string;
}

// Decode incoming taskFilter + petugasFilter props to unified assignee sentinel
function toAssigneeFilter(tf: string, pf: string | null): string {
  if (pf) { return pf; } // specific UUID takes precedence
  if (tf === 'assigned' || tf === 'tagged' || tf === 'created_by_me') { return tf; }
  return 'all';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskFilterModal({
  visible,
  onClose,
  taskFilter,
  statusFilter,
  dateFrom,
  dateTo,
  createdFrom,
  createdTo,
  rayonFilter,
  areaFilter,
  petugasFilter,
  onApplyFilters,
  onResetFilters,
  userRole,
  userRayonId,
  userAreaId,
  userId,
}: TaskFilterModalProps): React.JSX.Element {
  const { t } = useTranslation();
  // satgas, linmas, korlap: area is fixed to their assigned area
  const isAreaFixed = useMemo(() =>
    (userRole === 'satgas' || userRole === 'linmas' || userRole === 'korlap') && !!userAreaId
  , [userRole, userAreaId]);

  const showRayon = useMemo(() =>
    userRole === 'kepala_rayon' || userRole === 'admin_rayon' ||
    userRole === 'management' || userRole === 'admin_system' || userRole === 'superadmin'
  , [userRole]);

  const isRayonFixed = useMemo(() =>
    userRole === 'kepala_rayon' || userRole === 'admin_rayon'
  , [userRole]);

  const canFilterRayon = useMemo(() =>
    userRole === 'management' || userRole === 'admin_system' || userRole === 'superadmin'
  , [userRole]);

  const hasSubordinates = useMemo(
    () => (FILTER_SUBORDINATE_ROLES[userRole]?.length ?? 0) > 0,
    [userRole],
  );

  // Roles that can create tasks (and thus see "Dibuat oleh Saya").
  // May 12 — source of truth is the shared TASK_CREATORS constant which
  // mirrors backend role-groups. Previously hand-rolled here and got
  // stale after admin_rayon was added to TASK_CREATORS (May 11), hiding
  // the filter from admins who CAN create tasks via the pruning
  // Tugaskan flow.
  const canCreateTask = useMemo(
    () => (userRole ? TASK_CREATORS.includes(userRole) : false),
    [userRole],
  );

  const [localAssigneeFilter, setLocalAssigneeFilter] = useState(() => toAssigneeFilter(taskFilter, petugasFilter));
  const [localStatusFilter, setLocalStatusFilter] = useState(statusFilter);
  const [localDateFrom, setLocalDateFrom] = useState(dateFrom);
  const [localDateTo, setLocalDateTo] = useState(dateTo);
  const [localCreatedFrom, setLocalCreatedFrom] = useState(createdFrom);
  const [localCreatedTo, setLocalCreatedTo] = useState(createdTo);
  const [localRayonFilter, setLocalRayonFilter] = useState(rayonFilter);
  const [localAreaFilter, setLocalAreaFilter] = useState(areaFilter);

  const [rayons, setRayons] = useState<Rayon[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingRayons, setLoadingRayons] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (visible && (canFilterRayon || isRayonFixed)) loadRayons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, canFilterRayon, isRayonFixed]);

  useEffect(() => {
    if (!visible) return;
    if (isAreaFixed) return;
    const effectiveRayon = localRayonFilter ?? (isRayonFixed ? userRayonId : null) ?? userRayonId;
    if (effectiveRayon) {
      loadAreasByRayon(effectiveRayon);
    } else if (canFilterRayon) {
      loadAllAreas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, localRayonFilter, canFilterRayon, isAreaFixed, isRayonFixed, userRayonId]);

  useEffect(() => {
    if (!visible || !hasSubordinates) { return; }
    loadUsers(localAreaFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, localAreaFilter, hasSubordinates]);

  useEffect(() => {
    if (visible) {
      setLocalAssigneeFilter(toAssigneeFilter(taskFilter, petugasFilter));
      setLocalStatusFilter(statusFilter);
      setLocalDateFrom(dateFrom);
      setLocalDateTo(dateTo);
      setLocalCreatedFrom(createdFrom);
      setLocalCreatedTo(createdTo);
      setLocalRayonFilter(rayonFilter);
      setLocalAreaFilter(isAreaFixed ? (userAreaId ?? null) : areaFilter);
    }
  }, [visible, taskFilter, statusFilter, dateFrom, dateTo, createdFrom, createdTo, rayonFilter, areaFilter, petugasFilter, isAreaFixed, userAreaId]);

  const loadRayons = useCallback(async () => {
    setLoadingRayons(true);
    try {
      const response = await getRayons();
      if (response.data) setRayons(response.data);
    } catch (error) {
      if (__DEV__) { console.error('[TaskFilterModal] Error loading rayons:', error); }
    } finally {
      setLoadingRayons(false);
    }
  }, []);

  const loadUsers = useCallback(async (areaId: string | null) => {
    setLoadingUsers(true);
    try {
      const response = await getUsers(100);
      const allUsers: User[] = response.data ?? [];
      const subordinateRoles = FILTER_SUBORDINATE_ROLES[userRole] ?? [];
      let filtered = allUsers.filter((u) => u.id !== userId);
      if (subordinateRoles.length > 0) {
        filtered = filtered.filter((u) => subordinateRoles.includes(u.role));
      }
      if (areaId) {
        filtered = filtered.filter((u) => (u as any).location_id === areaId);
      }
      setUsers(filtered);
    } catch {
      // non-critical
    } finally {
      setLoadingUsers(false);
    }
  }, [userId, userRole]);

  const loadAllAreas = useCallback(async () => {
    setLoadingAreas(true);
    try {
      const response = await getAreas();
      if (response.data) setAreas(response.data);
    } catch (error) {
      if (__DEV__) { console.error('[TaskFilterModal] Error loading areas:', error); }
      setAreas([]);
    } finally {
      setLoadingAreas(false);
    }
  }, []);

  const loadAreasByRayon = useCallback(async (rayonId: string) => {
    setLoadingAreas(true);
    try {
      const response = await getAreasByRayonId(rayonId);
      if (response.data) setAreas(response.data);
    } catch (error) {
      if (__DEV__) { console.error('[TaskFilterModal] Error loading areas by rayon:', error); }
      setAreas([]);
    } finally {
      setLoadingAreas(false);
    }
  }, []);

  const handleApply = useCallback(() => {
    let derivedTaskFilter: 'all' | 'assigned' | 'tagged' | 'created_by_me' = 'all';
    let derivedPetugasFilter: string | null = null;
    if (localAssigneeFilter === 'assigned') {
      derivedTaskFilter = 'assigned';
    } else if (localAssigneeFilter === 'tagged') {
      derivedTaskFilter = 'tagged';
    } else if (localAssigneeFilter === 'created_by_me') {
      derivedTaskFilter = 'created_by_me';
    } else if (localAssigneeFilter !== 'all' && localAssigneeFilter !== 'all_subordinates') {
      // specific subordinate UUID
      derivedTaskFilter = 'all';
      derivedPetugasFilter = localAssigneeFilter;
    }
    onApplyFilters({
      taskFilter: derivedTaskFilter,
      statusFilter: localStatusFilter,
      dateFrom: localDateFrom,
      dateTo: localDateTo,
      createdFrom: localCreatedFrom,
      createdTo: localCreatedTo,
      rayonFilter: localRayonFilter,
      areaFilter: localAreaFilter,
      petugasFilter: derivedPetugasFilter,
    });
    onClose();
  }, [localAssigneeFilter, localStatusFilter, localDateFrom, localDateTo, localCreatedFrom, localCreatedTo, localRayonFilter, localAreaFilter, onApplyFilters, onClose]);

  const handleReset = useCallback(() => {
    setLocalAssigneeFilter('all');
    setLocalStatusFilter('all');
    setLocalDateFrom('');
    setLocalDateTo('');
    setLocalCreatedFrom('');
    setLocalCreatedTo('');
    setLocalRayonFilter(null);
    setLocalAreaFilter(isAreaFixed ? (userAreaId ?? null) : null);
    onResetFilters();
    onClose();
  }, [isAreaFixed, userAreaId, onResetFilters, onClose]);

  const handleRayonChange = useCallback((rayonId: string | number) => {
    const newRayonId = rayonId === 'all' ? null : String(rayonId);
    setLocalRayonFilter(newRayonId);
    setLocalAreaFilter(null);
    setAreas([]);
    if (newRayonId) loadAreasByRayon(newRayonId);
    else loadAllAreas();
  }, [loadAreasByRayon, loadAllAreas]);

  const handleAreaChange = useCallback((areaId: string | number) => {
    const newAreaId = areaId === 'all' ? null : String(areaId);
    setLocalAreaFilter(newAreaId);
    setLocalAssigneeFilter('all');
  }, []);

  // Date picker min/max constraints
  const dateFromParsed = parseFilterDate(localDateFrom);
  const dateToParsed = parseFilterDate(localDateTo);
  const createdFromParsed = parseFilterDate(localCreatedFrom);
  const createdToParsed = parseFilterDate(localCreatedTo);

  return (
    <NBModal
      visible={visible}
      onClose={onClose}
      title={t('tasks:filter.title')}
      footer={
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.resetButton]}
            onPress={handleReset}
            accessibilityRole="button"
          >
            <Text style={styles.resetButtonText}>{t('tasks:filter.reset')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.applyButton]}
            onPress={handleApply}
            accessibilityRole="button"
          >
            <Text style={styles.applyButtonText}>{t('tasks:filter.apply')}</Text>
          </TouchableOpacity>
        </View>
      }
    >
      {/* 1. Status */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>{t('tasks:filter.status')}</Text>
        <NBSelect
          value={localStatusFilter}
          onValueChange={(v) => setLocalStatusFilter(v as TaskStatus | 'all')}
          options={[
            { label: t('tasks:filter.statusOptions.all'), value: 'all' },
            { label: t('tasks:filter.statusOptions.pending'), value: 'pending' },
            { label: t('tasks:filter.statusOptions.assigned'), value: 'assigned' },
            { label: t('tasks:filter.statusOptions.accepted'), value: 'accepted' },
            { label: t('tasks:filter.statusOptions.declined'), value: 'declined' },
            { label: t('tasks:filter.statusOptions.inProgress'), value: 'in_progress' },
            { label: t('tasks:filter.statusOptions.completed'), value: 'completed' },
            { label: t('tasks:filter.statusOptions.verified'), value: 'verified' },
            { label: t('tasks:filter.statusOptions.revisionNeeded'), value: 'revision_needed' },
          ]}
          searchable
        />
      </View>

      {/* 2. Tanggal Dibuat */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>{t('tasks:filter.createdDate')}</Text>
        <View style={styles.dateRangeRow}>
          <View style={styles.dateButtonHalf}>
            <NBDatePicker
              value={createdFromParsed}
              onChange={(date) => setLocalCreatedFrom(toFilterDateString(date))}
              label={t('tasks:filter.dateFrom')}
              maximumDate={createdToParsed ?? undefined}
            />
          </View>

          <Text style={styles.dateSeparator}>→</Text>

          <View style={styles.dateButtonHalf}>
            <NBDatePicker
              value={createdToParsed}
              onChange={(date) => setLocalCreatedTo(toFilterDateString(date))}
              label={t('tasks:filter.dateTo')}
              minimumDate={createdFromParsed ?? undefined}
            />
          </View>
        </View>
      </View>

      {/* 3. Deadline */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>{t('tasks:filter.deadline')}</Text>
        <View style={styles.dateRangeRow}>
          <View style={styles.dateButtonHalf}>
            <NBDatePicker
              value={dateFromParsed}
              onChange={(date) => setLocalDateFrom(toFilterDateString(date))}
              label={t('tasks:filter.dateFrom')}
              maximumDate={dateToParsed ?? undefined}
            />
          </View>

          <Text style={styles.dateSeparator}>→</Text>

          <View style={styles.dateButtonHalf}>
            <NBDatePicker
              value={dateToParsed}
              onChange={(date) => setLocalDateTo(toFilterDateString(date))}
              label={t('tasks:filter.dateTo')}
              minimumDate={dateFromParsed ?? undefined}
            />
          </View>
        </View>
      </View>

      {/* 4. Rayon — role-gated */}
      {showRayon && (
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>{t('tasks:filter.rayon')}</Text>
          {isRayonFixed ? (
            <NBSelect
              value={userRayonId ?? 'all'}
              onValueChange={() => {}}
              options={[{ label: userRayonId ? t('tasks:filter.rayonOptions.mine') : t('tasks:filter.rayonOptions.all'), value: userRayonId ?? 'all' }]}
              disabled={true}
            />
          ) : (
            <NBSelect
              value={localRayonFilter || 'all'}
              onValueChange={handleRayonChange}
              options={[
                { label: t('tasks:filter.rayonOptions.all'), value: 'all' },
                ...rayons.map(r => ({ label: r.name, value: r.id })),
              ]}
              disabled={loadingRayons}
              searchable
            />
          )}
        </View>
      )}

      {/* 5. Area */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>{t('tasks:filter.area')}</Text>
        {isAreaFixed ? (
          <NBSelect
            value={userAreaId ?? 'all'}
            onValueChange={() => {}}
            options={[{ label: userAreaId ? t('tasks:filter.areaOptions.mine') : t('tasks:filter.areaOptions.all'), value: userAreaId ?? 'all' }]}
            disabled={true}
          />
        ) : canFilterRayon || isRayonFixed || userRayonId ? (
          <NBSelect
            value={localAreaFilter || 'all'}
            onValueChange={handleAreaChange}
            options={[
              { label: t('tasks:filter.areaOptions.all'), value: 'all' },
              ...areas.map(a => ({ label: a.name, value: a.id })),
            ]}
            disabled={loadingAreas}
            searchable
          />
        ) : null}
      </View>

      {/* 6. Penugasan */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>{t('tasks:filter.assignment')}</Text>
        <NBSelect
          value={localAssigneeFilter}
          onValueChange={(v) => setLocalAssigneeFilter(String(v))}
          options={[
            { label: t('tasks:filter.assignmentOptions.all'), value: 'all' },
            { label: t('tasks:filter.assignmentOptions.assigned'), value: 'assigned' },
            ...(canCreateTask ? [{ label: t('tasks:filter.assignmentOptions.createdByMe'), value: 'created_by_me' }] : []),
            ...(hasSubordinates ? [{ label: t('tasks:filter.assignmentOptions.allSubordinates'), value: 'all_subordinates' }] : []),
            { label: t('tasks:filter.assignmentOptions.tagged'), value: 'tagged' },
            ...users.map((u) => ({
              label: `${toTitleCase(u.role)} - ${u.full_name}`,
              value: u.id,
            })),
          ]}
          disabled={loadingUsers}
          searchable
        />
      </View>
    </NBModal>
  );
}

const styles = StyleSheet.create({
  filterSection: {
    marginBottom: nbSpacing.md + 4,
  },
  filterLabel: {
    fontSize: nbType.caption.fontSize,
    fontWeight: nbType.h1.fontWeight,
    color: nbColors.gray600,
    marginBottom: nbSpacing.xs + 2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: nbSpacing.xs,
  },
  dateButtonHalf: {
    flex: 1,
  },
  dateSeparator: {
    fontSize: nbType.body.fontSize,
    color: nbColors.gray500,
    alignSelf: 'center',
    paddingHorizontal: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: nbSpacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    minHeight: 46,
  },
  resetButton: {
    backgroundColor: nbColors.white,
  },
  resetButtonText: {
    fontSize: nbType.bodySm.fontSize,
    fontWeight: nbType.h1.fontWeight,
    color: nbColors.black,
    letterSpacing: 0.3,
  },
  applyButton: {
    backgroundColor: nbColors.primary,
  },
  applyButtonText: {
    fontSize: nbType.bodySm.fontSize,
    fontWeight: nbType.h1.fontWeight,
    color: nbColors.white,
    letterSpacing: 0.3,
  },
});
