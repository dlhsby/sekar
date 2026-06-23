/**
 * filterChips — utility to build filter chip arrays for FilterBar component
 */

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
  rayonFilter: string | null,
  areaFilter: string | null,
  initialRayonId: string | null,
  initialAreaId: string | null
): FilterChip[] {
  const chips: FilterChip[] = [];

  if (taskFilter !== 'assigned') {
    chips.push({
      text: taskFilter === 'tagged' ? 'Tag Saya' : taskFilter === 'created_by_me' ? 'Dibuat Saya' : 'Semua',
      tone: 'assignment',
    });
  }
  if (statusFilter !== 'all') {
    chips.push({ text: getTaskStatusLabel(statusFilter), tone: 'status' });
  }
  if (dateFrom || dateTo) {
    chips.push({
      text: dateFrom && dateTo ? `${dateFrom.slice(5)} — ${dateTo.slice(5)}` : 'Tanggal',
      tone: 'date',
    });
  }
  if (rayonFilter && rayonFilter !== initialRayonId) {
    chips.push({ text: 'Rayon', tone: 'location' });
  }
  if (areaFilter && areaFilter !== initialAreaId) {
    chips.push({ text: 'Area', tone: 'location' });
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
      pending: 'Menunggu Persetujuan',
      approved: 'Disetujui',
      rejected: 'Ditolak',
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
      text: from && to ? `${from.slice(5)} — ${to.slice(5)}` : 'Tanggal',
      tone: 'date',
    });
  }
  if (filters.activity_type_id) {
    chips.push({ text: 'Tipe', tone: 'assignment' });
  }
  if (filters.area_id && filters.area_id !== initialAreaId) {
    chips.push({ text: 'Area', tone: 'location' });
  }
  if (filters.rayon_id) {
    chips.push({ text: 'Rayon dipilih', tone: 'location' });
  }

  return chips;
}
