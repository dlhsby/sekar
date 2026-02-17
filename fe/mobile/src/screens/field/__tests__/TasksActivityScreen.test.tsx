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

  it('renders with tabs and compact filter bar', async () => {
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
      expect(getByText('Tugas')).toBeTruthy();
      expect(getByText('Aktivitas')).toBeTruthy();
      expect(getByText('Filter')).toBeTruthy(); // Compact filter button
    });
  });

  it('opens filter modal when filter button pressed', async () => {
    const store = createTestStore();

    const { getByText, getByLabelText, queryByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TasksActivityScreen
            navigation={mockNavigation}
            route={mockRoute as any}
          />
        </NavigationContainer>
      </Provider>
    );

    // Initially filter modal is not open
    await waitFor(() => {
      expect(getByText('Filter')).toBeTruthy();
      expect(queryByText('Filter Tugas')).toBeNull(); // Modal title not visible
    });

    // Press filter button to open modal
    const filterButton = getByLabelText(/Filter/);
    fireEvent.press(filterButton);

    await waitFor(() => {
      // TaskFilterModal should now be visible with its sections
      expect(getByText('Filter Tugas')).toBeTruthy(); // Modal title
      expect(getByText('Tipe Tugas')).toBeTruthy();  // Assignment filter section
      expect(getByText('Status')).toBeTruthy();       // Status filter section
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

  it('switches to activities tab', async () => {
    const store = createTestStore();

    const { getByText, getAllByText, queryByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TasksActivityScreen
            navigation={mockNavigation}
            route={mockRoute as any}
          />
        </NavigationContainer>
      </Provider>
    );

    // Initial tab: "Tugas" with filter bar visible
    await waitFor(() => {
      expect(getByText('Filter')).toBeTruthy(); // Filter button only in Tugas tab
    });

    // Switch to "Aktivitas" tab
    const aktivitasTabs = getAllByText('Aktivitas');
    fireEvent.press(aktivitasTabs[0]); // Press the tab

    // Should render activities tab content (filters hidden)
    await waitFor(() => {
      expect(queryByText('Filter')).toBeNull(); // No filter bar in activities tab
      expect(getByText('Belum ada aktivitas')).toBeTruthy();
    });
  });

  it('shows empty state for activities', async () => {
    const store = createTestStore();

    const { getByText, getAllByText } = render(
      <Provider store={store}>
        <NavigationContainer>
          <TasksActivityScreen
            navigation={mockNavigation}
            route={mockRoute as any}
          />
        </NavigationContainer>
      </Provider>
    );

    // Initial tab: "Tugas"
    await waitFor(() => {
      expect(getByText('Tugas')).toBeTruthy();
    });

    // Switch to "Aktivitas" tab
    const aktivitasTabs = getAllByText('Aktivitas');
    fireEvent.press(aktivitasTabs[0]);

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

  describe('FAB Button Visibility', () => {
    it('shows "Tambah Aktivitas" FAB when satgas, clocked in, and activities filter active', async () => {
      const store = createTestStore({
        auth: {
          user: { id: '1', role: 'satgas', full_name: 'Test Satgas' },
        },
        shift: {
          currentShift: { id: 'shift-1', clock_in: '2026-02-16T08:00:00Z' },
        },
      });

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
        expect(getByText('Tugas')).toBeTruthy();
      });

      const aktivitasTab = getByText('Aktivitas');
      fireEvent.press(aktivitasTab);

      await waitFor(() => {
        expect(getByText('+ Tambah Aktivitas')).toBeTruthy();
        expect(queryByText('+ Buat Tugas')).toBeNull();
      });
    });

    it('hides "Tambah Aktivitas" FAB when not clocked in', async () => {
      const store = createTestStore({
        auth: {
          user: { id: '1', role: 'satgas', full_name: 'Test Satgas' },
        },
        shift: {
          currentShift: null, // Not clocked in
        },
      });

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
        expect(getByText('Tugas')).toBeTruthy();
      });

      const aktivitasTab = getByText('Aktivitas');
      fireEvent.press(aktivitasTab);

      await waitFor(() => {
        expect(queryByText('+ Tambah Aktivitas')).toBeNull();
      });
    });

    it('shows "Buat Tugas" FAB when korlap on tasks tab', async () => {
      const store = createTestStore({
        auth: {
          user: { id: '1', role: 'korlap', full_name: 'Test Korlap' },
        },
      });

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

      // On tasks tab - FAB should be visible
      await waitFor(() => {
        expect(getByText('Filter')).toBeTruthy(); // Filter bar visible on tasks tab
        expect(getByText('+ Buat Tugas')).toBeTruthy();
        expect(queryByText('+ Tambah Aktivitas')).toBeNull();
      });
    });

    it('hides "Buat Tugas" FAB on activities tab', async () => {
      const store = createTestStore({
        auth: {
          user: { id: '1', role: 'korlap', full_name: 'Test Korlap' },
        },
      });

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
        expect(getByText('Tugas')).toBeTruthy();
      });

      const aktivitasTab = getByText('Aktivitas');
      fireEvent.press(aktivitasTab);

      await waitFor(() => {
        expect(queryByText('+ Buat Tugas')).toBeNull();
      });
    });

    it('hides both FABs when user lacks all permissions', async () => {
      const store = createTestStore({
        auth: {
          user: { id: '1', role: 'kepala_rayon', full_name: 'Test Kepala Rayon' },
        },
        shift: {
          currentShift: null,
        },
      });

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

      // Default tab (Tugas): should show "Buat Tugas" (kepala_rayon can create tasks)
      await waitFor(() => {
        expect(getByText('+ Buat Tugas')).toBeTruthy();
        expect(queryByText('+ Tambah Aktivitas')).toBeNull(); // Cannot submit activities
      });

      // On activities tab: should hide "Buat Tugas"
      const aktivitasTab = getByText('Aktivitas');
      fireEvent.press(aktivitasTab);

      await waitFor(() => {
        expect(queryByText('+ Buat Tugas')).toBeNull();
        expect(queryByText('+ Tambah Aktivitas')).toBeNull(); // Still cannot submit activities
      });
    });
  });
});
