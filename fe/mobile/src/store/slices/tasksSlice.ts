/**
 * Tasks Slice
 * Task management state for workers
 * Phase 2 feature
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Task, TaskStatus } from '../../types/models.types';

interface TasksState {
  tasks: Task[];
  selectedTask: Task | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  filter: {
    status: TaskStatus | 'all';
  };
}

const initialState: TasksState = {
  tasks: [],
  selectedTask: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  filter: {
    status: 'all',
  },
};

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setSubmitting: (state, action: PayloadAction<boolean>) => {
      state.isSubmitting = action.payload;
    },

    setTasks: (state, action: PayloadAction<Task[]>) => {
      state.tasks = action.payload;
      state.isLoading = false;
      state.error = null;
    },

    addTask: (state, action: PayloadAction<Task>) => {
      state.tasks.unshift(action.payload);
      state.isSubmitting = false;
      state.error = null;
    },

    updateTask: (state, action: PayloadAction<Task>) => {
      const index = state.tasks.findIndex((t) => t.id === action.payload.id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
      // Also update selectedTask if it's the same task
      if (state.selectedTask?.id === action.payload.id) {
        state.selectedTask = action.payload;
      }
      state.isSubmitting = false;
      state.error = null;
    },

    removeTask: (state, action: PayloadAction<string>) => {
      state.tasks = state.tasks.filter((t) => t.id !== action.payload);
      if (state.selectedTask?.id === action.payload) {
        state.selectedTask = null;
      }
    },

    setSelectedTask: (state, action: PayloadAction<Task | null>) => {
      state.selectedTask = action.payload;
    },

    updateTaskStatus: (
      state,
      action: PayloadAction<{ taskId: string; status: TaskStatus }>
    ) => {
      const { taskId, status } = action.payload;
      const task = state.tasks.find((t) => t.id === taskId);
      if (task) {
        task.status = status;
      }
      if (state.selectedTask?.id === taskId) {
        state.selectedTask.status = status;
      }
      state.isSubmitting = false;
    },

    setFilterStatus: (state, action: PayloadAction<TaskStatus | 'all'>) => {
      state.filter.status = action.payload;
    },

    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
      state.isSubmitting = false;
    },

    clearError: (state) => {
      state.error = null;
    },

    clearTasks: (state) => {
      state.tasks = [];
      state.selectedTask = null;
    },

    resetState: () => initialState,
  },
});

export const {
  setLoading,
  setSubmitting,
  setTasks,
  addTask,
  updateTask,
  removeTask,
  setSelectedTask,
  updateTaskStatus,
  setFilterStatus,
  setError,
  clearError,
  clearTasks,
  resetState,
} = tasksSlice.actions;

// Selectors
export const selectAllTasks = (state: { tasks: TasksState }) => state.tasks.tasks;

export const selectFilteredTasks = (state: { tasks: TasksState }) => {
  const { tasks, filter } = state.tasks;
  if (filter.status === 'all') {
    return tasks;
  }
  return tasks.filter((task) => task.status === filter.status);
};

export const selectSelectedTask = (state: { tasks: TasksState }) =>
  state.tasks.selectedTask;

export const selectTasksLoading = (state: { tasks: TasksState }) =>
  state.tasks.isLoading;

export const selectTasksSubmitting = (state: { tasks: TasksState }) =>
  state.tasks.isSubmitting;

export const selectTasksError = (state: { tasks: TasksState }) =>
  state.tasks.error;

export const selectPendingTasksCount = (state: { tasks: TasksState }) =>
  state.tasks.tasks.filter(
    (t) => t.status === 'pending' || t.status === 'assigned'
  ).length;

export const selectInProgressTasksCount = (state: { tasks: TasksState }) =>
  state.tasks.tasks.filter(
    (t) => t.status === 'accepted' || t.status === 'in_progress'
  ).length;

export default tasksSlice.reducer;
