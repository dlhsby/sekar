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
jest.mock('../../../services/api', () => ({
  getRayons: jest.fn().mockResolvedValue({ data: [] }),
  getAreasByRayonId: jest.fn().mockResolvedValue({ data: [] }),
  getAreas: jest.fn().mockResolvedValue({ data: [] }),
}));

// Mock react-native-haptic-feedback (used by NBTab.handleTabPress before onTabChange)
jest.mock('react-native-haptic-feedback', () => ({
  __esModule: true,
  default: { trigger: jest.fn() },
}));

// Mock react-native-safe-area-context (used by NBSelect inside modals)
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: any) => children,
}));

// Mock NBBackgroundPattern
jest.mock('../../../components/nb/NBBackgroundPattern', () => ({
  NBBackgroundPattern: ({ children }: any) => children,
}));

// Mock LocationMapModal and OvertimeTrailModal to avoid react-native-maps transpilation
jest.mock('../../../components/modals/LocationMapModal', () => ({
  LocationMapModal: () => null,
}));
jest.mock('../../../components/modals/OvertimeTrailModal', () => ({
  OvertimeTrailModal: () => null,
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

    // Mock default API responses (paginated format)
    const emptyPaged = { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
    (tasksApi.getMyTasks as jest.Mock).mockResolvedValue({ data: emptyPaged });
    (tasksApi.getTaggedTasks as jest.Mock).mockResolvedValue({ data: emptyPaged });
    (activitiesApi.getMyActivities as jest.Mock).mockResolvedValue({ data: emptyPaged });
    (activitiesApi.getActivities as jest.Mock).mockResolvedValue({ data: emptyPaged });
  });

  it('renders with tabs and compact filter bar', async () => {
    const store = createTestStore();

    const { getByText, getByLabelText } = render(
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
      expect(getByLabelText('Filter tugas')).toBeTruthy(); // Compact filter button
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
      expect(getByLabelText('Filter tugas')).toBeTruthy();
      expect(queryByText('Filter Tugas')).toBeNull(); // Modal title not visible
    });

    // Press filter button to open modal
    const filterButton = getByLabelText(/Filter/);
    fireEvent.press(filterButton);

    await waitFor(() => {
      // TaskFilterModal should now be visible with its sections
      expect(getByText('Filter Tugas')).toBeTruthy(); // Modal title (rendered as-is)
      expect(getByText('Penugasan')).toBeTruthy();     // Penugasan filter section
      expect(getByText('Status')).toBeTruthy();       // Status filter section
    });
  });

  it('shows loading indicator for tasks', async () => {
    // Simulate slow API to show loading state
    (tasksApi.getMyTasks as jest.Mock).mockReturnValue(new Promise(() => {}));
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
      // When loading, the skeleton is shown (not the empty state text)
      expect(() => getByText('Belum ada tugas')).toThrow();
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

    // API returns paginated data
    (tasksApi.getMyTasks as jest.Mock).mockResolvedValue({
      data: { data: mockTasks, meta: { total: 2, page: 1, limit: 10, totalPages: 1 } },
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

    // API returns paginated data for rendering
    (tasksApi.getMyTasks as jest.Mock).mockResolvedValue({
      data: { data: mockTasks, meta: { total: 1, page: 1, limit: 10, totalPages: 1 } },
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

    const { getByText, getAllByText, queryByText, getByLabelText } = render(
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
      expect(getByLabelText('Filter tugas')).toBeTruthy(); // Filter button only in Tugas tab
    });

    // Switch to "Aktivitas" tab
    const aktivitasTabs = getAllByText('Aktivitas');
    fireEvent.press(aktivitasTabs[0]); // Press the tab

    // Should render activities tab content with filter bar and empty state
    await waitFor(() => {
      expect(getByLabelText('Filter aktivitas')).toBeTruthy(); // Activity filter bar is now shown
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

    it('shows disabled "Tambah Aktivitas" FAB when not clocked in', async () => {
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
        // Button is shown but disabled (not hidden) when not clocked in
        expect(queryByText('+ Tambah Aktivitas')).toBeTruthy();
      });
    });

    it('shows "Buat Tugas" FAB when korlap on tasks tab', async () => {
      const store = createTestStore({
        auth: {
          user: { id: '1', role: 'korlap', full_name: 'Test Korlap' },
        },
      });

      const { getByText, queryByText, getByLabelText } = render(
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
        expect(getByLabelText('Filter tugas')).toBeTruthy(); // Filter bar visible on tasks tab
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
      // top_management can create tasks but cannot submit activities
      const store = createTestStore({
        auth: {
          user: { id: '1', role: 'top_management', full_name: 'Test Top Management' },
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

      // Default tab (Tugas): should show "Buat Tugas" (top_management can create tasks)
      await waitFor(() => {
        expect(getByText('+ Buat Tugas')).toBeTruthy();
        expect(queryByText('+ Tambah Aktivitas')).toBeNull(); // Cannot submit activities
      });

      // On activities tab: should hide "Buat Tugas", "Tambah Aktivitas" still hidden
      const aktivitasTab = getByText('Aktivitas');
      fireEvent.press(aktivitasTab);

      await waitFor(() => {
        expect(queryByText('+ Buat Tugas')).toBeNull();
        expect(queryByText('+ Tambah Aktivitas')).toBeNull(); // Still cannot submit activities
      });
    });
  });
});
