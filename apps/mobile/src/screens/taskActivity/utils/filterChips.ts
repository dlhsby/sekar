/**
 * filterChips — utility to build filter chip arrays for FilterBar component
 */

import i18n from '../../../i18n/config';
import { getTaskStatusLabel } from '../../../utils/statusHelpers';
import type { TaskStatus } from '../../../types/models.types';
import type { ActivitiesFilter } from '../../../types/api.types';
import type { TaskFilterType } from '../hooks/useTasksActivityFilters';
import type { FilterChip } from '../../../components/common';

export function buildTaskFilterChips(
  taskFilter: TaskFilterType,
  statusFilter: TaskStatus | 'all',
  dateFrom: string,
  dateTo: string,
  districtFilter: string | null,
  areaFilter: string | null,
  initialDistrictId: string | null,
  initialAreaId: string | null
): FilterChip[] {
  const chips: FilterChip[] = [];

  if (taskFilter !== 'assigned') {
    let chipText = i18n.t('tasks:filterChips.all');
    if (taskFilter === 'tagged') {
      chipText = i18n.t('tasks:filterChips.tagged');
    } else if (taskFilter === 'created_by_me') {
      chipText = i18n.t('tasks:filterChips.createdByMe');
    }
    chips.push({
      text: chipText,
      tone: 'assignment',
    });
  }
  if (statusFilter !== 'all') {
    chips.push({ text: getTaskStatusLabel(statusFilter), tone: 'status' });
  }
  if (dateFrom || dateTo) {
    chips.push({
      text: dateFrom && dateTo ? `${dateFrom.slice(5)} — ${dateTo.slice(5)}` : i18n.t('tasks:filterChips.date'),
      tone: 'date',
    });
  }
  if (districtFilter && districtFilter !== initialDistrictId) {
    chips.push({ text: i18n.t('tasks:filterChips.district'), tone: 'location' });
  }
  if (areaFilter && areaFilter !== initialAreaId) {
    chips.push({ text: i18n.t('tasks:filterChips.area'), tone: 'location' });
  }

  return chips;
}

export function buildActivityFilterChips(
  filters: ActivitiesFilter,
  initialAreaId: string | null
): FilterChip[] {
  const chips: FilterChip[] = [];

  if (filters.status) {
    const activityStatusLabels: Record<string, string> = {
      pending: i18n.t('tasks:filterChips.activityStatusPending'),
      approved: i18n.t('tasks:filterChips.activityStatusApproved'),
      rejected: i18n.t('tasks:filterChips.activityStatusRejected'),
    };
    chips.push({
      text: activityStatusLabels[filters.status] || filters.status,
      tone: 'status',
    });
  }
  if (filters.from_date || filters.to_date) {
    const from = filters.from_date;
    const to = filters.to_date;
    chips.push({
      text: from && to ? `${from.slice(5)} — ${to.slice(5)}` : i18n.t('tasks:filterChips.date'),
      tone: 'date',
    });
  }
  if (filters.activity_type_id) {
    chips.push({ text: i18n.t('tasks:filterChips.type'), tone: 'assignment' });
  }
  if (filters.location_id && filters.location_id !== initialAreaId) {
    chips.push({ text: i18n.t('tasks:filterChips.area'), tone: 'location' });
  }
  if (filters.district_id) {
    chips.push({ text: i18n.t('tasks:filterChips.districtSelected'), tone: 'location' });
  }

  return chips;
}
