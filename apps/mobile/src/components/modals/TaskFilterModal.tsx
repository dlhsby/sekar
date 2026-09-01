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
import type { TaskStatus, UserRole, District, Area, User } from '../../types/models.types';
import { getDistricts, getAreasByDistrictId, getAreas, getUsers } from '../../services/api';
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
  districtFilter: string | null;
  areaFilter: string | null;
  petugasFilter: string | null;
  onApplyFilters: (filters: {
    taskFilter: 'all' | 'assigned' | 'tagged' | 'created_by_me';
    statusFilter: TaskStatus | 'all';
    dateFrom: string;
    dateTo: string;
    createdFrom: string;
    createdTo: string;
    districtFilter: string | null;
    areaFilter: string | null;
    petugasFilter: string | null;
  }) => void;
  onResetFilters: () => void;
  userRole: UserRole;
  userDistrictId?: string;
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
  districtFilter,
  areaFilter,
  petugasFilter,
  onApplyFilters,
  onResetFilters,
  userRole,
  userDistrictId,
  userAreaId,
  userId,
}: TaskFilterModalProps): React.JSX.Element {
  const { t } = useTranslation();
  // satgas, linmas, korlap: area is fixed to their assigned area
  const isAreaFixed = useMemo(() =>
    (userRole === 'satgas' || userRole === 'linmas' || userRole === 'korlap') && !!userAreaId
  , [userRole, userAreaId]);

  const showDistrict = useMemo(() =>
    userRole === 'kepala_rayon' || userRole === 'admin_rayon' ||
    userRole === 'management' || userRole === 'admin_system' || userRole === 'superadmin'
  , [userRole]);

  const isDistrictFixed = useMemo(() =>
    userRole === 'kepala_rayon' || userRole === 'admin_rayon'
  , [userRole]);

  const canFilterDistrict = useMemo(() =>
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
  const [localDistrictFilter, setLocalDistrictFilter] = useState(districtFilter);
  const [localAreaFilter, setLocalAreaFilter] = useState(areaFilter);

  const [districts, setDistricts] = useState<District[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (visible && (canFilterDistrict || isDistrictFixed)) loadDistricts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, canFilterDistrict, isDistrictFixed]);

  useEffect(() => {
    if (!visible) return;
    if (isAreaFixed) return;
    const effectiveDistrict = localDistrictFilter ?? (isDistrictFixed ? userDistrictId : null) ?? userDistrictId;
    if (effectiveDistrict) {
      loadAreasByDistrict(effectiveDistrict);
    } else if (canFilterDistrict) {
      loadAllAreas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, localDistrictFilter, canFilterDistrict, isAreaFixed, isDistrictFixed, userDistrictId]);

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
      setLocalDistrictFilter(districtFilter);
      setLocalAreaFilter(isAreaFixed ? (userAreaId ?? null) : areaFilter);
    }
  }, [visible, taskFilter, statusFilter, dateFrom, dateTo, createdFrom, createdTo, districtFilter, areaFilter, petugasFilter, isAreaFixed, userAreaId]);

  const loadDistricts = useCallback(async () => {
    setLoadingDistricts(true);
    try {
      const response = await getDistricts();
      if (response.data) setDistricts(response.data);
    } catch (error) {
      if (__DEV__) { console.error('[TaskFilterModal] Error loading districts:', error); }
    } finally {
      setLoadingDistricts(false);
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

  const loadAreasByDistrict = useCallback(async (districtId: string) => {
    setLoadingAreas(true);
    try {
      const response = await getAreasByDistrictId(districtId);
      if (response.data) setAreas(response.data);
    } catch (error) {
      if (__DEV__) { console.error('[TaskFilterModal] Error loading areas by district:', error); }
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
      districtFilter: localDistrictFilter,
      areaFilter: localAreaFilter,
      petugasFilter: derivedPetugasFilter,
    });
    onClose();
  }, [localAssigneeFilter, localStatusFilter, localDateFrom, localDateTo, localCreatedFrom, localCreatedTo, localDistrictFilter, localAreaFilter, onApplyFilters, onClose]);

  const handleReset = useCallback(() => {
    setLocalAssigneeFilter('all');
    setLocalStatusFilter('all');
    setLocalDateFrom('');
    setLocalDateTo('');
    setLocalCreatedFrom('');
    setLocalCreatedTo('');
    setLocalDistrictFilter(null);
    setLocalAreaFilter(isAreaFixed ? (userAreaId ?? null) : null);
    onResetFilters();
    onClose();
  }, [isAreaFixed, userAreaId, onResetFilters, onClose]);

  const handleDistrictChange = useCallback((districtId: string | number) => {
    const newDistrictId = districtId === 'all' ? null : String(districtId);
    setLocalDistrictFilter(newDistrictId);
    setLocalAreaFilter(null);
    setAreas([]);
    if (newDistrictId) loadAreasByDistrict(newDistrictId);
    else loadAllAreas();
  }, [loadAreasByDistrict, loadAllAreas]);

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
      {showDistrict && (
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>{t('tasks:filter.district')}</Text>
          {isDistrictFixed ? (
            <NBSelect
              value={userDistrictId ?? 'all'}
              onValueChange={() => {}}
              options={[{ label: userDistrictId ? t('tasks:filter.districtOptions.mine') : t('tasks:filter.districtOptions.all'), value: userDistrictId ?? 'all' }]}
              disabled={true}
            />
          ) : (
            <NBSelect
              value={localDistrictFilter || 'all'}
              onValueChange={handleDistrictChange}
              options={[
                { label: t('tasks:filter.districtOptions.all'), value: 'all' },
                ...districts.map(r => ({ label: r.name, value: r.id })),
              ]}
              disabled={loadingDistricts}
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
        ) : canFilterDistrict || isDistrictFixed || userDistrictId ? (
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
