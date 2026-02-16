/**
 * Tasks Slice Tests
 * Unit tests for task management state
 */

import tasksReducer, {
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
  selectFilteredTasks,
  selectPendingTasksCount,
  selectInProgressTasksCount,
} from '../tasksSlice';
import type { Task, TaskStatus } from '../../../types/models.types';

describe('tasksSlice', () => {
  const initialState = {
    tasks: [],
    taggedTasks: [],
    selectedTask: null,
    isLoading: false,
    isSubmitting: false,
    error: null,
    filter: {
      status: 'all' as TaskStatus | 'all',
      type: 'all' as 'assigned' | 'tagged' | 'created' | 'all',
    },
  };

  const mockTask: Task = {
    id: 'task-001',
    title: 'Test Task',
    description: 'A test task description',
    status: 'pending',
    priority: 'medium',
    area_id: 'area-001',
    activity_type_id: 'activity-001',
    created_by: 'user-001',
    created_at: '2026-01-19T10:00:00Z',
    updated_at: '2026-01-19T10:00:00Z',
  };

  const mockTasks: Task[] = [
    mockTask,
    {
      ...mockTask,
      id: 'task-002',
      title: 'Second Task',
      status: 'in_progress',
    },
    {
      ...mockTask,
      id: 'task-003',
      title: 'Third Task',
      status: 'completed',
    },
  ];

  describe('initial state', () => {
    it('should return initial state', () => {
      expect(tasksReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });
  });

  describe('setLoading', () => {
    it('should set loading to true', () => {
      const state = tasksReducer(initialState, setLoading(true));
      expect(state.isLoading).toBe(true);
    });

    it('should set loading to false', () => {
      const loadingState = { ...initialState, isLoading: true };
      const state = tasksReducer(loadingState, setLoading(false));
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setSubmitting', () => {
    it('should set submitting to true', () => {
      const state = tasksReducer(initialState, setSubmitting(true));
      expect(state.isSubmitting).toBe(true);
    });

    it('should set submitting to false', () => {
      const submittingState = { ...initialState, isSubmitting: true };
      const state = tasksReducer(submittingState, setSubmitting(false));
      expect(state.isSubmitting).toBe(false);
    });
  });

  describe('setTasks', () => {
    it('should set tasks array', () => {
      const state = tasksReducer(initialState, setTasks(mockTasks));
      expect(state.tasks).toEqual(mockTasks);
      expect(state.tasks).toHaveLength(3);
    });

    it('should clear loading when setting tasks', () => {
      const loadingState = { ...initialState, isLoading: true };
      const state = tasksReducer(loadingState, setTasks(mockTasks));
      expect(state.isLoading).toBe(false);
    });

    it('should clear error when setting tasks', () => {
      const errorState = { ...initialState, error: 'Previous error' };
      const state = tasksReducer(errorState, setTasks(mockTasks));
      expect(state.error).toBeNull();
    });

    it('should handle empty tasks array', () => {
      const state = tasksReducer(initialState, setTasks([]));
      expect(state.tasks).toEqual([]);
    });
  });

  describe('addTask', () => {
    it('should add task to beginning of array', () => {
      const stateWithTasks = { ...initialState, tasks: [mockTasks[1]] };
      const state = tasksReducer(stateWithTasks, addTask(mockTask));
      expect(state.tasks[0]).toEqual(mockTask);
      expect(state.tasks).toHaveLength(2);
    });

    it('should clear submitting when adding task', () => {
      const submittingState = { ...initialState, isSubmitting: true };
      const state = tasksReducer(submittingState, addTask(mockTask));
      expect(state.isSubmitting).toBe(false);
    });

    it('should clear error when adding task', () => {
      const errorState = { ...initialState, error: 'Previous error' };
      const state = tasksReducer(errorState, addTask(mockTask));
      expect(state.error).toBeNull();
    });
  });

  describe('updateTask', () => {
    it('should update existing task', () => {
      const stateWithTasks = { ...initialState, tasks: mockTasks };
      const updatedTask = { ...mockTask, title: 'Updated Title' };
      const state = tasksReducer(stateWithTasks, updateTask(updatedTask));
      expect(state.tasks[0].title).toBe('Updated Title');
    });

    it('should update selectedTask if same task', () => {
      const stateWithSelected = {
        ...initialState,
        tasks: mockTasks,
        selectedTask: mockTask,
      };
      const updatedTask = { ...mockTask, title: 'Updated Title' };
      const state = tasksReducer(stateWithSelected, updateTask(updatedTask));
      expect(state.selectedTask?.title).toBe('Updated Title');
    });

    it('should not modify other tasks', () => {
      const stateWithTasks = { ...initialState, tasks: mockTasks };
      const updatedTask = { ...mockTask, title: 'Updated Title' };
      const state = tasksReducer(stateWithTasks, updateTask(updatedTask));
      expect(state.tasks[1]).toEqual(mockTasks[1]);
    });
  });

  describe('removeTask', () => {
    it('should remove task from array', () => {
      const stateWithTasks = { ...initialState, tasks: mockTasks };
      const state = tasksReducer(stateWithTasks, removeTask('task-001'));
      expect(state.tasks).toHaveLength(2);
      expect(state.tasks.find((t) => t.id === 'task-001')).toBeUndefined();
    });

    it('should clear selectedTask if same task removed', () => {
      const stateWithSelected = {
        ...initialState,
        tasks: mockTasks,
        selectedTask: mockTask,
      };
      const state = tasksReducer(stateWithSelected, removeTask('task-001'));
      expect(state.selectedTask).toBeNull();
    });
  });

  describe('setSelectedTask', () => {
    it('should set selected task', () => {
      const state = tasksReducer(initialState, setSelectedTask(mockTask));
      expect(state.selectedTask).toEqual(mockTask);
    });

    it('should clear selected task when null', () => {
      const stateWithSelected = { ...initialState, selectedTask: mockTask };
      const state = tasksReducer(stateWithSelected, setSelectedTask(null));
      expect(state.selectedTask).toBeNull();
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status', () => {
      const stateWithTasks = { ...initialState, tasks: mockTasks };
      const state = tasksReducer(
        stateWithTasks,
        updateTaskStatus({ taskId: 'task-001', status: 'in_progress' })
      );
      expect(state.tasks[0].status).toBe('in_progress');
    });

    it('should update selectedTask status if same task', () => {
      const stateWithSelected = {
        ...initialState,
        tasks: mockTasks,
        selectedTask: mockTask,
      };
      const state = tasksReducer(
        stateWithSelected,
        updateTaskStatus({ taskId: 'task-001', status: 'completed' })
      );
      expect(state.selectedTask?.status).toBe('completed');
    });

    it('should clear submitting', () => {
      const submittingState = {
        ...initialState,
        tasks: mockTasks,
        isSubmitting: true,
      };
      const state = tasksReducer(
        submittingState,
        updateTaskStatus({ taskId: 'task-001', status: 'in_progress' })
      );
      expect(state.isSubmitting).toBe(false);
    });
  });

  describe('setFilterStatus', () => {
    it('should set filter status', () => {
      const state = tasksReducer(initialState, setFilterStatus('pending'));
      expect(state.filter.status).toBe('pending');
    });

    it('should set filter to all', () => {
      const filteredState = {
        ...initialState,
        filter: { status: 'pending' as TaskStatus | 'all', type: 'all' as 'assigned' | 'tagged' | 'created' | 'all' },
      };
      const state = tasksReducer(filteredState, setFilterStatus('all'));
      expect(state.filter.status).toBe('all');
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      const state = tasksReducer(initialState, setError('Failed to load'));
      expect(state.error).toBe('Failed to load');
    });

    it('should clear loading when setting error', () => {
      const loadingState = { ...initialState, isLoading: true };
      const state = tasksReducer(loadingState, setError('Error'));
      expect(state.isLoading).toBe(false);
    });

    it('should clear submitting when setting error', () => {
      const submittingState = { ...initialState, isSubmitting: true };
      const state = tasksReducer(submittingState, setError('Error'));
      expect(state.isSubmitting).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error', () => {
      const errorState = { ...initialState, error: 'Some error' };
      const state = tasksReducer(errorState, clearError());
      expect(state.error).toBeNull();
    });
  });

  describe('clearTasks', () => {
    it('should clear all tasks and selected task', () => {
      const stateWithTasks = {
        ...initialState,
        tasks: mockTasks,
        selectedTask: mockTask,
      };
      const state = tasksReducer(stateWithTasks, clearTasks());
      expect(state.tasks).toEqual([]);
      expect(state.selectedTask).toBeNull();
    });
  });

  describe('resetState', () => {
    it('should reset to initial state', () => {
      const modifiedState = {
        tasks: mockTasks,
        selectedTask: mockTask,
        isLoading: true,
        isSubmitting: true,
        error: 'Some error',
        filter: { status: 'pending' as TaskStatus | 'all', type: 'all' as 'assigned' | 'tagged' | 'created' | 'all' },
      };
      const state = tasksReducer(modifiedState, resetState());
      expect(state).toEqual(initialState);
    });
  });

  describe('selectors', () => {
    describe('selectFilteredTasks', () => {
      it('should return all tasks when filter is all', () => {
        const state = { tasks: { ...initialState, tasks: mockTasks } };
        const result = selectFilteredTasks(state);
        expect(result).toEqual(mockTasks);
      });

      it('should filter tasks by status', () => {
        const state = {
          tasks: {
            ...initialState,
            tasks: mockTasks,
            filter: { status: 'pending' as TaskStatus | 'all', type: 'all' as 'assigned' | 'tagged' | 'created' | 'all' },
          },
        };
        const result = selectFilteredTasks(state);
        expect(result).toHaveLength(1);
        expect(result[0].status).toBe('pending');
      });
    });

    describe('selectPendingTasksCount', () => {
      it('should count pending and assigned tasks', () => {
        const tasksWithAssigned = [
          ...mockTasks,
          { ...mockTask, id: 'task-004', status: 'assigned' as TaskStatus },
        ];
        const state = { tasks: { ...initialState, tasks: tasksWithAssigned } };
        const result = selectPendingTasksCount(state);
        expect(result).toBe(2); // 1 pending + 1 assigned
      });
    });

    describe('selectInProgressTasksCount', () => {
      it('should count only in_progress tasks', () => {
        const state = { tasks: { ...initialState, tasks: mockTasks } };
        const result = selectInProgressTasksCount(state);
        expect(result).toBe(1); // Only 1 in_progress (no 'accepted' status in Phase 2C)
      });
    });
  });

  describe('state transitions', () => {
    it('should handle full fetch flow', () => {
      let state = tasksReducer(initialState, setLoading(true));
      expect(state.isLoading).toBe(true);

      state = tasksReducer(state, setTasks(mockTasks));
      expect(state.tasks).toEqual(mockTasks);
      expect(state.isLoading).toBe(false);
    });

    it('should handle task completion flow', () => {
      let state = tasksReducer(initialState, setTasks(mockTasks));

      state = tasksReducer(state, setSubmitting(true));
      expect(state.isSubmitting).toBe(true);

      state = tasksReducer(
        state,
        updateTaskStatus({ taskId: 'task-001', status: 'completed' })
      );
      expect(state.tasks[0].status).toBe('completed');
      expect(state.isSubmitting).toBe(false);
    });

    it('should handle error flow', () => {
      let state = tasksReducer(initialState, setLoading(true));

      state = tasksReducer(state, setError('Network error'));
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);

      state = tasksReducer(state, clearError());
      expect(state.error).toBeNull();
    });
  });
});
