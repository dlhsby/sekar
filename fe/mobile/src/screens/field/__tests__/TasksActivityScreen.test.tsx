/**
 * TasksActivityScreen Tests
 * Tests for Phase 2C tabbed tasks and activities view
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { TasksActivityScreen } from '../TasksActivityScreen';
import { configureStore } from '@reduxjs/toolkit';
import tasksReducer from '../../../store/slices/tasksSlice';
import authReducer from '../../../store/slices/authSlice';
import shiftReducer from '../../../store/slices/shiftSlice';
import activitiesReducer from '../../../store/slices/activitiesSlice';
import offlineReducer from '../../../store/slices/offlineSlice';
import * as tasksApi from '../../../services/api/tasksApi';
import * as activitiesApi from '../../../services/api/activitiesApi';

// Mock APIs
jest.mock('../../../services/api/tasksApi');
jest.mock('../../../services/api/activitiesApi');

// Mock NBBackgroundPattern
jest.mock('../../../components/nb/NBBackgroundPattern', () => ({
  NBBackgroundPattern: ({ children }: any) => children,
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate } as any;
const mockRoute = { params: {} };

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
  useRoute: () => mockRoute,
  useFocusEffect: (callback: any) => {
    const React = require('react');
    React.useEffect(() => {
      callback();
    }, []);
  },
  NavigationContainer: ({ children }: any) => children,
}));

// Mock useRoleAccess
jest.mock('../../../hooks/useRoleAccess', () => ({
  useRoleAccess: jest.fn(() => ({
    role: 'satgas',
    canCreateTask: false,
    canSubmitActivity: true,
  })),
}));

// Helper to create test store
const createTestStore = (overrides: any = {}) => {
  return configureStore({
    reducer: {
      tasks: tasksReducer,
      auth: authReducer,
      shift: shiftReducer,
      activities: activitiesReducer,
      offline: offlineReducer,
    },
    preloadedState: {
      tasks: {
        tasks: [],
        taggedTasks: [],
        selectedTask: null,
        isLoading: false,
        isSubmitting: false,
        error: null,
        filter: {
          status: 'all' as const,
          type: 'all' as const,
        },
        ...overrides.tasks,
      },
      auth: {
        user: {
          id: '1',
          username: 'satgas1',
          full_name: 'Test Satgas',
          role: 'satgas',
        },
        assignedArea: null,
        token: 'test-token',
        isAuthenticated: true,
        loading: false,
        error: null,
        ...overrides.auth,
      },
      shift: {
        currentShift: null,
        shiftHistory: [],
        isClockingIn: false,
        isClockingOut: false,
        error: null,
        ...overrides.shift,
      },
      activities: {
        activitiesList: [],
        isLoading: false,
        isSubmitting: false,
        error: null,
        ...overrides.activities,
      },
      offline: {
        isOnline: true,
        isSyncing: false,
        queue: [],
        pendingShiftsCount: 0,
        pendingActivitiesCount: 0,
        pendingMediaCount: 0,
        pendingLocationsCount: 0,
        lastSyncTime: null,
        syncError: null,
        ...overrides.offline,
      },
    },
  });
};

describe('TasksActivityScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock default API responses
    (tasksApi.getMyTasks as jest.Mock).mockResolvedValue({ data: [] });
    (tasksApi.getTaggedTasks as jest.Mock).mockResolvedValue({ data: [] });
    (activitiesApi.getMyActivities as jest.Mock).mockResolvedValue({
      data: [],
    });
  });

  it('renders with 3 tabs', async () => {
    const store = createTestStore();

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TasksActivityScreen
            navigation={mockNavigation}
            route={mockRoute as any}
          />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByText('Tugas Saya')).toBeTruthy();
      expect(getByText('Tag Saya')).toBeTruthy();
      expect(getByText('Aktivitas')).toBeTruthy();
    });
  });

  it('shows loading indicator for tasks', async () => {
    const store = createTestStore({
      tasks: { isLoading: true },
    });

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TasksActivityScreen
            navigation={mockNavigation}
            route={mockRoute as any}
          />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByText('Memuat tugas...')).toBeTruthy();
    });
  });

  it('shows empty state when no tasks', async () => {
    const store = createTestStore();

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TasksActivityScreen
            navigation={mockNavigation}
            route={mockRoute as any}
          />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByText('Belum ada tugas')).toBeTruthy();
    });
  });

  it('shows task list items with title and status badge', async () => {
    const mockTasks = [
      {
        id: '1',
        title: 'Task 1',
        description: 'Description 1',
        status: 'assigned',
        priority: 'medium',
        area: { id: '1', name: 'Park A' },
      },
      {
        id: '2',
        title: 'Task 2',
        description: 'Description 2',
        status: 'completed',
        priority: 'high',
        rayon: { id: '1', name: 'Rayon 1' },
      },
    ];

    // API returns data which gets dispatched to store
    (tasksApi.getMyTasks as jest.Mock).mockResolvedValue({
      data: mockTasks,
    });

    const store = createTestStore();

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TasksActivityScreen
            navigation={mockNavigation}
            route={mockRoute as any}
          />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByText('Task 1')).toBeTruthy();
      expect(getByText('Task 2')).toBeTruthy();
    });
  });

  it('handles API error gracefully', async () => {
    (tasksApi.getMyTasks as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    const store = createTestStore();

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TasksActivityScreen
            navigation={mockNavigation}
            route={mockRoute as any}
          />
        </NavigationContainer>
      </Provider>
    );

    // Verify component renders without crashing despite API error
    await waitFor(() => {
      expect(getByText('Tugas & Aktivitas')).toBeTruthy();
      expect(tasksApi.getMyTasks).toHaveBeenCalled();
    });
  });

  it('navigates to TaskDetail on press', async () => {
    const mockTasks = [
      {
        id: 'task-123',
        title: 'Clickable Task',
        description: 'Task description',
        status: 'assigned',
        priority: 'medium',
      },
    ];

    // API returns data for rendering
    (tasksApi.getMyTasks as jest.Mock).mockResolvedValue({
      data: mockTasks,
    });

    const store = createTestStore();

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TasksActivityScreen
            navigation={mockNavigation}
            route={mockRoute as any}
          />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(getByText('Clickable Task')).toBeTruthy();
    });

    fireEvent.press(getByText('Clickable Task'));

    expect(mockNavigate).toHaveBeenCalledWith('TaskDetail', {
      taskId: 'task-123',
    });
  });

  it('renders activities tab', async () => {
    const store = createTestStore();

    const { getByText, queryByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TasksActivityScreen
            navigation={mockNavigation}
            route={mockRoute as any}
          />
        </NavigationContainer>
      </Provider>
    );

    // Switch to activities tab
    await waitFor(() => {
      expect(getByText('Aktivitas')).toBeTruthy();
    });

    fireEvent.press(getByText('Aktivitas'));

    // Should render the activities tab content
    await waitFor(() => {
      expect(getByText('Belum ada aktivitas')).toBeTruthy();
    });
  });

  it('shows empty state for activities', async () => {
    const store = createTestStore();

    const { getByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TasksActivityScreen
            navigation={mockNavigation}
            route={mockRoute as any}
          />
        </NavigationContainer>
      </Provider>
    );

    // Switch to activities tab
    await waitFor(() => {
      expect(getByText('Aktivitas')).toBeTruthy();
    });

    fireEvent.press(getByText('Aktivitas'));

    await waitFor(() => {
      expect(getByText('Belum ada aktivitas')).toBeTruthy();
    });
  });

  it('calls APIs on mount', async () => {
    const store = createTestStore();

    render(
      <Provider store={store}>
        <NavigationContainer>
          <TasksActivityScreen
            navigation={mockNavigation}
            route={mockRoute as any}
          />
        </NavigationContainer>
      </Provider>
    );

    await waitFor(() => {
      expect(tasksApi.getMyTasks).toHaveBeenCalled();
    });
  });
});
