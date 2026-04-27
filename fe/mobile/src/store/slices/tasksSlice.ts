/**
 * Tasks Slice
 * Task management state
 * Phase 2C: 4 statuses, tagged tasks, no accept/decline
 * Phase 3 3-6: partial-complete, resume, lineage
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { Task, TaskStatus } from '../../types/models.types';
import * as tasksApi from '../../services/api/tasksApi';

/** Task lineage: parent chain + this task + children */
export interface TaskLineage {
  parent?: Task;
  task: Task;
  children: Task[];
}

interface TasksState {
  tasks: Task[];
  taggedTasks: Task[];
  selectedTask: Task | null;
  lineageById: Record<string, TaskLineage>;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  filter: {
    status: TaskStatus | 'all';
    type: 'assigned' | 'tagged' | 'created' | 'all';
  };
}

const initialState: TasksState = {
  tasks: [],
  taggedTasks: [],
  selectedTask: null,
  lineageById: {},
  isLoading: false,
  isSubmitting: false,
  error: null,
  filter: {
    status: 'all',
    type: 'all',
  },
};

/**
 * Partial-complete a task: increment completed_plant_count, optionally spawn child task
 * Phase 3 3-6
 */
export const partialCompleteTask = createAsyncThunk(
  'tasks/partialComplete',
  async (
    {
      taskId,
      dto,
    }: {
      taskId: string;
      dto: {
        completed_count: number;
        plant_items?: Array<{ species_id: string; count: number }>;
        notes?: string;
        resume_tomorrow?: boolean;
      };
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await tasksApi.partialCompleteTask(taskId, dto);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (err) {
      return rejectWithValue(String(err));
    }
  },
);

/**
 * Resume a task: spawn child task with remaining target_plant_count
 * Phase 3 3-6
 */
export const resumeTask = createAsyncThunk(
  'tasks/resume',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await tasksApi.resumeTask(taskId);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (err) {
      return rejectWithValue(String(err));
    }
  },
);

/**
 * Fetch task lineage: parent chain + this task + children
 * Phase 3 3-6
 */
export const fetchTaskLineage = createAsyncThunk(
  'tasks/fetchLineage',
  async (taskId: string, { rejectWithValue }) => {
    try {
      const response = await tasksApi.getTaskLineage(taskId);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return { taskId, lineage: response.data };
    } catch (err) {
      return rejectWithValue(String(err));
    }
  },
);

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

    setTaggedTasks: (state, action: PayloadAction<Task[]>) => {
      state.taggedTasks = action.payload;
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
      const tagIdx = state.taggedTasks.findIndex(
        (t) => t.id === action.payload.id,
      );
      if (tagIdx !== -1) {
        state.taggedTasks[tagIdx] = action.payload;
      }
      if (state.selectedTask?.id === action.payload.id) {
        state.selectedTask = action.payload;
      }
      state.isSubmitting = false;
      state.error = null;
    },

    removeTask: (state, action: PayloadAction<string>) => {
      state.tasks = state.tasks.filter((t) => t.id !== action.payload);
      state.taggedTasks = state.taggedTasks.filter(
        (t) => t.id !== action.payload,
      );
      if (state.selectedTask?.id === action.payload) {
        state.selectedTask = null;
      }
    },

    setSelectedTask: (state, action: PayloadAction<Task | null>) => {
      state.selectedTask = action.payload;
    },

    updateTaskStatus: (
      state,
      action: PayloadAction<{ taskId: string; status: TaskStatus }>,
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

    setFilterType: (state, action: PayloadAction<'assigned' | 'tagged' | 'created' | 'all'>) => {
      state.filter.type = action.payload;
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
      state.taggedTasks = [];
      state.selectedTask = null;
    },

    resetState: () => initialState,
  },
  extraReducers: (builder) => {
    // partialCompleteTask
    builder
      .addCase(partialCompleteTask.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(partialCompleteTask.fulfilled, (state, action) => {
        const { task } = action.payload;
        const index = state.tasks.findIndex((t) => t.id === task.id);
        if (index !== -1) {
          state.tasks[index] = task;
        }
        if (state.selectedTask?.id === task.id) {
          state.selectedTask = task;
        }
        state.isSubmitting = false;
        state.error = null;
      })
      .addCase(partialCompleteTask.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      });

    // resumeTask
    builder
      .addCase(resumeTask.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(resumeTask.fulfilled, (state) => {
        state.isSubmitting = false;
        state.error = null;
      })
      .addCase(resumeTask.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      });

    // fetchTaskLineage
    builder
      .addCase(fetchTaskLineage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTaskLineage.fulfilled, (state, action) => {
        const { taskId, lineage } = action.payload;
        state.lineageById[taskId] = lineage;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(fetchTaskLineage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setLoading,
  setSubmitting,
  setTasks,
  setTaggedTasks,
  addTask,
  updateTask,
  removeTask,
  setSelectedTask,
  updateTaskStatus,
  setFilterStatus,
  setFilterType,
  setError,
  clearError,
  clearTasks,
  resetState,
} = tasksSlice.actions;

// Selectors
export const selectAllTasks = (state: { tasks: TasksState }) =>
  state.tasks.tasks;

export const selectTaggedTasks = (state: { tasks: TasksState }) =>
  state.tasks.taggedTasks;

export const selectFilteredTasks = (state: { tasks: TasksState }) => {
  const { tasks, filter } = state.tasks;
  if (filter.status === 'all') return tasks;
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
    (t) => t.status === 'pending' || t.status === 'assigned',
  ).length;

export const selectInProgressTasksCount = (state: { tasks: TasksState }) =>
  state.tasks.tasks.filter((t) => t.status === 'in_progress').length;

export const selectTaskLineage = (taskId: string) => (state: { tasks: TasksState }) =>
  state.tasks.lineageById[taskId];

export default tasksSlice.reducer;
