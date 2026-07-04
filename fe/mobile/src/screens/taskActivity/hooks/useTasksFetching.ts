/**
 * useTasksFetching — tasks pagination & fetching logic
 * Handles fetch queueing, pagination, filter application.
 */

import { useState, useCallback, useRef } from 'react';
import i18n from '../../../i18n/config';
import { getMyTasks, getTaggedTasks } from '../../../services/api/tasksApi';
import type { Task, TaskStatus } from '../../../types/models.types';

export type TaskFilterType = 'all' | 'assigned' | 'tagged' | 'created_by_me';
export type TaskSortOption = 'created_at_desc' | 'created_at_asc' | 'deadline_asc' | 'priority_desc';

const TASKS_PAGE_LIMIT = 10;

export function sortToParams(sort: TaskSortOption): { sort_by: string; sort_dir: 'asc' | 'desc' } {
  switch (sort) {
    case 'created_at_asc': return { sort_by: 'created_at', sort_dir: 'asc' };
    case 'deadline_asc': return { sort_by: 'deadline', sort_dir: 'asc' };
    case 'priority_desc': return { sort_by: 'priority', sort_dir: 'desc' };
    default: return { sort_by: 'created_at', sort_dir: 'desc' };
  }
}

export interface UseTasksFetchingResult {
  allTasks: Task[];
  taskPage: number;
  hasMoreTasks: boolean;
  loadingTasks: boolean;
  isLoadingMoreTasks: boolean;
  tasksError: string | null;
  fetchTasks: (page: number, reset: boolean) => Promise<void>;
  loadMoreTasks: () => void;
}

interface UseTasksFetchingOptions {
  taskFilter: TaskFilterType;
  statusFilter: TaskStatus | 'all';
  dateFrom: string;
  dateTo: string;
  createdFrom: string;
  createdTo: string;
  petugasFilter: string | null;
  rayonFilter: string | null;
  areaFilter: string | null;
  taskSort: TaskSortOption;
}

export function useTasksFetching(options: UseTasksFetchingOptions): UseTasksFetchingResult {
  const {
    taskFilter,
    statusFilter,
    dateFrom,
    dateTo,
    createdFrom,
    createdTo,
    petugasFilter,
    rayonFilter,
    areaFilter,
    taskSort,
  } = options;

  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [taskPage, setTaskPage] = useState(1);
  const [hasMoreTasks, setHasMoreTasks] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [isLoadingMoreTasks, setIsLoadingMoreTasks] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const isFetchingTasks = useRef(false);
  const pendingTaskFetch = useRef<{ page: number; reset: boolean } | null>(null);

  const buildTaskParams = useCallback((page: number) => {
    const { sort_by, sort_dir } = sortToParams(taskSort);
    return {
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      ...(dateFrom ? { deadline_after: dateFrom } : {}),
      ...(dateTo ? { deadline_before: dateTo } : {}),
      ...(createdFrom ? { created_after: createdFrom } : {}),
      ...(createdTo ? { created_before: createdTo } : {}),
      sort_by,
      sort_dir,
      page,
      limit: TASKS_PAGE_LIMIT,
      ...(rayonFilter ? { rayon_id: rayonFilter } : {}),
      ...(areaFilter ? { area_id: areaFilter } : {}),
      ...(petugasFilter ? { assigned_to: petugasFilter } : {}),
    };
  }, [taskSort, statusFilter, dateFrom, dateTo, createdFrom, createdTo, rayonFilter, areaFilter, petugasFilter]);

  const fetchTasks = useCallback(async (page: number, reset: boolean) => {
    if (isFetchingTasks.current) {
      pendingTaskFetch.current = { page, reset };
      return;
    }
    isFetchingTasks.current = true;

    if (page === 1) {
      setLoadingTasks(true);
    } else {
      setIsLoadingMoreTasks(true);
    }
    setTasksError(null);

    try {
      const params = buildTaskParams(page);
      const allParams = params as Record<string, unknown>;
      const baseParams = {
        ...(allParams.status ? { status: allParams.status as string } : {}),
        ...(allParams.deadline_after ? { deadline_after: allParams.deadline_after as string } : {}),
        ...(allParams.deadline_before ? { deadline_before: allParams.deadline_before as string } : {}),
        ...(allParams.created_after ? { created_after: allParams.created_after as string } : {}),
        ...(allParams.created_before ? { created_before: allParams.created_before as string } : {}),
        sort_by: allParams.sort_by as string,
        sort_dir: allParams.sort_dir as 'asc' | 'desc',
        page: allParams.page as number,
        limit: allParams.limit as number,
      };
      const myTasksParams = baseParams;
      let fetchedTasks: Task[] = [];
      let totalPages = 1;

      if (taskFilter === 'tagged') {
        const response = await getTaggedTasks(baseParams);
        const paged = response.data;
        fetchedTasks = paged?.data ?? [];
        totalPages = paged?.meta?.totalPages ?? 1;
      } else if (taskFilter === 'all') {
        const [myRes, tagRes] = await Promise.all([
          getMyTasks({ ...myTasksParams, scope: 'all', limit: 50, page: 1 }),
          getTaggedTasks({ ...baseParams, limit: 50, page: 1 }),
        ]);
        const seen = new Set<string>();
        const merged: Task[] = [];
        for (const t of [...(myRes.data?.data ?? []), ...(tagRes.data?.data ?? [])]) {
          if (!seen.has(t.id)) { seen.add(t.id); merged.push(t); }
        }
        fetchedTasks = merged;
        totalPages = 1;
      } else {
        const scope = taskFilter === 'created_by_me' ? 'created' : 'assigned';
        const response = await getMyTasks({ ...myTasksParams, scope });
        const paged = response.data;
        fetchedTasks = paged?.data ?? [];
        totalPages = paged?.meta?.totalPages ?? 1;
      }

      if (reset || page === 1) {
        setAllTasks(fetchedTasks);
      } else {
        setAllTasks((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          return [...prev, ...fetchedTasks.filter((t) => !existingIds.has(t.id))];
        });
      }
      setTaskPage(page);
      setHasMoreTasks(page < totalPages);
    } catch {
      setTasksError(i18n.t('tasks:list.loadError'));
    } finally {
      setLoadingTasks(false);
      setIsLoadingMoreTasks(false);
      isFetchingTasks.current = false;
      if (pendingTaskFetch.current) {
        const { page: p, reset: r } = pendingTaskFetch.current;
        pendingTaskFetch.current = null;
        fetchTasks(p, r);
      }
    }
  }, [buildTaskParams, taskFilter]);

  const loadMoreTasks = useCallback(() => {
    if (!hasMoreTasks || isLoadingMoreTasks || loadingTasks) return;
    fetchTasks(taskPage + 1, false);
  }, [hasMoreTasks, isLoadingMoreTasks, loadingTasks, taskPage, fetchTasks]);

  return {
    allTasks,
    taskPage,
    hasMoreTasks,
    loadingTasks,
    isLoadingMoreTasks,
    tasksError,
    fetchTasks,
    loadMoreTasks,
  };
}
