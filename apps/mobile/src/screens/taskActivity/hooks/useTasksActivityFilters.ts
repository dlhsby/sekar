/**
 * useTasksActivityFilters — task filter state, handlers, and metrics
 * Manages all 8 task filter fields + activeFilterCount calculation.
 */

import { useState, useCallback, useMemo } from 'react';
import type { TaskStatus } from '../../../types/models.types';

export type TaskFilterType = 'all' | 'assigned' | 'tagged' | 'created_by_me';

export interface TasksActivityFiltersState {
  taskFilter: TaskFilterType;
  statusFilter: TaskStatus | 'all';
  dateFrom: string;
  dateTo: string;
  createdFrom: string;
  createdTo: string;
  petugasFilter: string | null;
  rayonFilter: string | null;
  areaFilter: string | null;
}

export interface UseTasksActivityFiltersResult extends TasksActivityFiltersState {
  setTaskFilter: (filter: TaskFilterType) => void;
  setStatusFilter: (status: TaskStatus | 'all') => void;
  setDateFrom: (date: string) => void;
  setDateTo: (date: string) => void;
  setCreatedFrom: (date: string) => void;
  setCreatedTo: (date: string) => void;
  setPetugasFilter: (petugas: string | null) => void;
  setRayonFilter: (rayon: string | null) => void;
  setAreaFilter: (area: string | null) => void;
  activeFilterCount: number;
  handleApplyFilters: (filters: TasksActivityFiltersState) => void;
  handleResetFilters: () => void;
}

interface UseTasksActivityFiltersOptions {
  initialRayonId: string | null;
  initialAreaId: string | null;
}

export function useTasksActivityFilters(
  options: UseTasksActivityFiltersOptions
): UseTasksActivityFiltersResult {
  const { initialRayonId, initialAreaId } = options;

  const [taskFilter, setTaskFilter] = useState<TaskFilterType>('assigned');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [createdFrom, setCreatedFrom] = useState<string>('');
  const [createdTo, setCreatedTo] = useState<string>('');
  const [petugasFilter, setPetugasFilter] = useState<string | null>(null);
  const [rayonFilter, setRayonFilter] = useState<string | null>(initialRayonId);
  const [areaFilter, setAreaFilter] = useState<string | null>(initialAreaId);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (taskFilter !== 'assigned') count++;
    if (statusFilter !== 'all') count++;
    if (dateFrom || dateTo) count++;
    if (rayonFilter && rayonFilter !== initialRayonId) count++;
    if (areaFilter && areaFilter !== initialAreaId) count++;
    return count;
  }, [taskFilter, statusFilter, dateFrom, dateTo, rayonFilter, areaFilter, initialRayonId, initialAreaId]);

  const handleApplyFilters = useCallback((filters: TasksActivityFiltersState) => {
    setTaskFilter(filters.taskFilter);
    setStatusFilter(filters.statusFilter);
    setDateFrom(filters.dateFrom);
    setDateTo(filters.dateTo);
    setCreatedFrom(filters.createdFrom);
    setCreatedTo(filters.createdTo);
    setRayonFilter(filters.rayonFilter);
    setAreaFilter(filters.areaFilter);
    setPetugasFilter(filters.petugasFilter);
  }, []);

  const handleResetFilters = useCallback(() => {
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setCreatedFrom('');
    setCreatedTo('');
    setPetugasFilter(null);
    setTaskFilter('assigned');
    setRayonFilter(initialRayonId);
    setAreaFilter(initialAreaId);
  }, [initialRayonId, initialAreaId]);

  return {
    taskFilter,
    statusFilter,
    dateFrom,
    dateTo,
    createdFrom,
    createdTo,
    petugasFilter,
    rayonFilter,
    areaFilter,
    setTaskFilter,
    setStatusFilter,
    setDateFrom,
    setDateTo,
    setCreatedFrom,
    setCreatedTo,
    setPetugasFilter,
    setRayonFilter,
    setAreaFilter,
    activeFilterCount,
    handleApplyFilters,
    handleResetFilters,
  };
}
