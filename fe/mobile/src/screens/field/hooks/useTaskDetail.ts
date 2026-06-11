/**
 * useTaskDetail Hook
 * Manages task loading, refreshing, and delegation state
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert } from 'react-native';
import * as tasksApi from '../../../services/api/tasksApi';
import type { Task } from '../../../types/models.types';

export interface UseTaskDetailReturn {
  task: Task | null;
  isLoading: boolean;
  isRefreshing: boolean;
  delegations: tasksApi.TaskDelegation[];
  fetchTask: () => Promise<void>;
  handleRefresh: () => void;
}

export function useTaskDetail(taskId: string): UseTaskDetailReturn {
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [delegations, setDelegations] = useState<tasksApi.TaskDelegation[]>([]);

  const fetchTask = useCallback(async () => {
    try {
      const response = await tasksApi.getTaskById(taskId);
      if (response.data) {
        setTask(response.data);
      } else if (response.error) {
        Alert.alert('Error', response.error);
      }
    } catch {
      Alert.alert('Error', 'Gagal memuat detail tugas');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [taskId]);

  const fetchDelegations = useCallback(async () => {
    try {
      const response = await tasksApi.getTaskDelegations(taskId);
      if (response.data) {
        setDelegations(response.data);
      }
    } catch {
      // best-effort
    }
  }, [taskId]);

  // Initial load
  useEffect(() => {
    fetchTask();
    fetchDelegations();
  }, [fetchTask, fetchDelegations]);

  // Refresh on focus (after completing a task and coming back)
  const isMounted = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (isMounted.current) {
        fetchTask();
      } else {
        isMounted.current = true;
      }
    }, [fetchTask]),
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchTask();
  }, [fetchTask]);

  return {
    task,
    isLoading,
    isRefreshing,
    delegations,
    fetchTask,
    handleRefresh,
  };
}
