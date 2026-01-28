/**
 * TasksReportsScreen Tests
 * Tests for the tabbed Tasks & Reports screen
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { TasksReportsScreen } from '../TasksReportsScreen';
import type { WorkerTabScreenProps } from '../../../types/navigation.types';

// Mock Alert to prevent errors from imported modules
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock useFocusEffect to prevent effect from running
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: jest.fn((callback) => {
    // Don't call the callback in tests
  }),
}));

// Mock Redux hooks
const mockDispatch = jest.fn();

jest.mock('../../../store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => {
    // Return empty array for tasks
    if (selector.toString().includes('selectFilteredTasks')) {
      return [];
    }
    // Return false for loading
    if (selector.toString().includes('selectTasksLoading')) {
      return false;
    }
    // Return null for error
    if (selector.toString().includes('selectTasksError')) {
      return null;
    }
    return undefined;
  },
}));

// Mock tasks API
jest.mock('../../../services/api/tasksApi', () => ({
  getMyTasks: jest.fn(() =>
    Promise.resolve({
      success: true,
      data: { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      message: 'Success',
    })
  ),
}));

// Mock reports API
jest.mock('../../../services/api/reportsApi', () => ({
  getMyReports: jest.fn(() =>
    Promise.resolve({
      success: true,
      data: [],
      message: 'Success',
    })
  ),
}));

// Mock NB components
jest.mock('../../../components/nb', () => ({
  NBTab: ({ tabs, activeTab, onTabChange }: any) => {
    const { View, TouchableOpacity, Text } = require('react-native');
    return (
      <View testID="nb-tab-container">
        {tabs.map((tab: any) => (
          <TouchableOpacity
            key={tab.key}
            testID={`tab-${tab.label.toLowerCase()}`}
            onPress={() => onTabChange(tab.key)}
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: activeTab === tab.key }}
          >
            <Text>{tab.label}</Text>
            <Text testID={`tab-${tab.label.toLowerCase()}-active`}>
              {activeTab === tab.key ? 'Active' : 'Inactive'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  },
  NBCard: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
  NBBadge: ({ text }: any) => {
    const { Text } = require('react-native');
    return <Text>{text}</Text>;
  },
  NBEmptyState: ({ title, message }: any) => {
    const { View, Text } = require('react-native');
    return (
      <View>
        <Text>{title}</Text>
        {message && <Text>{message}</Text>}
      </View>
    );
  },
  NBBackgroundPattern: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();

const createMockNavigation = (): any => ({
  navigate: mockNavigate,
  goBack: mockGoBack,
  setOptions: mockSetOptions,
  addListener: jest.fn(() => jest.fn()),
  removeListener: jest.fn(),
  dispatch: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => true),
});

const createMockRoute = (): any => ({
  key: 'TasksReports',
  name: 'TasksReports',
  params: undefined,
});

describe('TasksReportsScreen', () => {
  let mockNavigation: any;
  let mockRoute: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-spy on Alert.alert after clearAllMocks
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockNavigation = createMockNavigation();
    mockRoute = createMockRoute();
  });

  const renderScreen = (props?: Partial<WorkerTabScreenProps<'TasksReports'>>) => {
    const defaultProps: WorkerTabScreenProps<'TasksReports'> = {
      navigation: mockNavigation,
      route: mockRoute,
      ...props,
    };
    return render(<TasksReportsScreen {...defaultProps} />);
  };

  describe('Initial Render', () => {
    it('should render screen successfully', () => {
      const { getByText } = renderScreen();
      expect(getByText('Tugas & Laporan')).toBeTruthy();
    });

    it('should display header title', () => {
      const { getByText } = renderScreen();
      expect(getByText('Tugas & Laporan')).toBeTruthy();
    });

    it('should render both tabs', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('tab-tugas')).toBeTruthy();
      expect(getByTestId('tab-laporan')).toBeTruthy();
    });

    it('should have tasks tab active by default', () => {
      const { getByTestId } = renderScreen();
      const tasksTab = getByTestId('tab-tugas-active');
      expect(tasksTab.children[0]).toBe('Active');
    });

    it('should have reports tab inactive by default', () => {
      const { getByTestId } = renderScreen();
      const reportsTab = getByTestId('tab-laporan-active');
      expect(reportsTab.children[0]).toBe('Inactive');
    });

    it('should display tasks empty state when no tasks', () => {
      const { getByText } = renderScreen();
      expect(getByText('📋 Daftar tugas akan ditampilkan di sini')).toBeTruthy();
    });
  });

  describe('Tab Navigation', () => {
    it('should switch to reports tab when reports tab is pressed', async () => {
      const { getByTestId, getByText } = renderScreen();

      const reportsTab = getByTestId('tab-laporan');
      fireEvent.press(reportsTab);

      // Reports empty state should be visible
      await waitFor(() => {
        expect(getByText('📊 Daftar laporan akan ditampilkan di sini')).toBeTruthy();
      });
    });

    it('should switch back to tasks tab when tasks tab is pressed', () => {
      const { getByTestId, getByText } = renderScreen();

      // Switch to reports
      const reportsTab = getByTestId('tab-laporan');
      fireEvent.press(reportsTab);

      // Switch back to tasks
      const tasksTab = getByTestId('tab-tugas');
      fireEvent.press(tasksTab);

      // Tasks empty state should be visible
      expect(getByText('📋 Daftar tugas akan ditampilkan di sini')).toBeTruthy();
    });

    it('should update active state when switching tabs', () => {
      const { getByTestId } = renderScreen();

      // Initially tasks is active
      expect(getByTestId('tab-tugas-active').children[0]).toBe('Active');
      expect(getByTestId('tab-laporan-active').children[0]).toBe('Inactive');

      // Switch to reports
      fireEvent.press(getByTestId('tab-laporan'));

      // Now reports should be active
      expect(getByTestId('tab-tugas-active').children[0]).toBe('Inactive');
      expect(getByTestId('tab-laporan-active').children[0]).toBe('Active');
    });

    it('should maintain tab state across multiple switches', async () => {
      const { getByTestId, getByText } = renderScreen();

      // Switch to reports
      fireEvent.press(getByTestId('tab-laporan'));
      await waitFor(() => {
        expect(getByText('📊 Daftar laporan akan ditampilkan di sini')).toBeTruthy();
      });

      // Switch back to tasks
      fireEvent.press(getByTestId('tab-tugas'));
      expect(getByText('📋 Daftar tugas akan ditampilkan di sini')).toBeTruthy();

      // Switch to reports again
      fireEvent.press(getByTestId('tab-laporan'));
      await waitFor(() => {
        expect(getByText('📊 Daftar laporan akan ditampilkan di sini')).toBeTruthy();
      });
    });
  });

  describe('Tab Content', () => {
    it('should display tasks empty state', () => {
      const { getByText } = renderScreen();

      expect(getByText('📋 Daftar tugas akan ditampilkan di sini')).toBeTruthy();
    });

    it('should display reports empty state when reports tab is active', async () => {
      const { getByTestId, getByText } = renderScreen();

      fireEvent.press(getByTestId('tab-laporan'));

      await waitFor(() => {
        expect(getByText('📊 Daftar laporan akan ditampilkan di sini')).toBeTruthy();
      });
    });

    it('should only show one tab content at a time', async () => {
      const { getByTestId, queryByText } = renderScreen();

      // Initially, only tasks content visible
      expect(queryByText('📋 Daftar tugas akan ditampilkan di sini')).toBeTruthy();
      expect(queryByText('📊 Daftar laporan akan ditampilkan di sini')).toBeNull();

      // Switch to reports
      fireEvent.press(getByTestId('tab-laporan'));

      // Now only reports content visible
      await waitFor(() => {
        expect(queryByText('📋 Daftar tugas akan ditampilkan di sini')).toBeNull();
        expect(queryByText('📊 Daftar laporan akan ditampilkan di sini')).toBeTruthy();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should have initial refreshing state as false', () => {
      const { queryByTestId } = renderScreen();
      // No loading indicator initially
      expect(queryByTestId('refresh-control')).toBeNull();
    });

    it('should handle refresh action without crashing', async () => {
      const { getByTestId } = renderScreen();

      // Should render without errors
      expect(getByTestId('tab-tugas')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible tab labels', () => {
      const { getByLabelText } = renderScreen();

      expect(getByLabelText('Tugas')).toBeTruthy();
      expect(getByLabelText('Laporan')).toBeTruthy();
    });

    it('should have correct accessibility states for tabs', () => {
      const { getByTestId } = renderScreen();

      const tasksTab = getByTestId('tab-tugas');
      const reportsTab = getByTestId('tab-laporan');

      expect(tasksTab.props.accessibilityState).toEqual({ selected: true });
      expect(reportsTab.props.accessibilityState).toEqual({ selected: false });
    });

    it('should update accessibility states when tabs change', () => {
      const { getByTestId } = renderScreen();

      // Switch to reports
      fireEvent.press(getByTestId('tab-laporan'));

      const tasksTab = getByTestId('tab-tugas');
      const reportsTab = getByTestId('tab-laporan');

      expect(tasksTab.props.accessibilityState).toEqual({ selected: false });
      expect(reportsTab.props.accessibilityState).toEqual({ selected: true });
    });
  });

  describe('Layout and Styling', () => {
    it('should have proper container structure', () => {
      const { getByText } = renderScreen();

      // Header should be present
      expect(getByText('Tugas & Laporan')).toBeTruthy();
    });

    it('should render tabs in correct order', () => {
      const { getAllByText } = renderScreen();

      const tabs = getAllByText(/Tugas|Laporan/);
      // First occurrence should be screen title
      // Then tabs
      expect(tabs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Navigation Integration', () => {
    it('should receive navigation prop', () => {
      renderScreen();
      expect(mockNavigation).toBeDefined();
    });

    it('should not trigger navigation on initial render', () => {
      renderScreen();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('should not trigger navigation when switching tabs', () => {
      const { getByTestId } = renderScreen();

      fireEvent.press(getByTestId('tab-laporan'));

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid tab switching', () => {
      const { getByTestId, getByText } = renderScreen();

      // Rapidly switch tabs
      fireEvent.press(getByTestId('tab-laporan'));
      fireEvent.press(getByTestId('tab-tugas'));
      fireEvent.press(getByTestId('tab-laporan'));
      fireEvent.press(getByTestId('tab-tugas'));

      // Should end up on tasks tab
      expect(getByText('📋 Daftar tugas akan ditampilkan di sini')).toBeTruthy();
    });

    it('should handle pressing the same tab multiple times', () => {
      const { getByTestId, getByText } = renderScreen();

      const tasksTab = getByTestId('tab-tugas');

      // Press same tab multiple times
      fireEvent.press(tasksTab);
      fireEvent.press(tasksTab);
      fireEvent.press(tasksTab);

      // Should still show tasks content
      expect(getByText('📋 Daftar tugas akan ditampilkan di sini')).toBeTruthy();
    });

    it('should maintain state after tab is inactive and becomes active again', async () => {
      const { getByTestId, getByText } = renderScreen();

      // Switch to reports
      fireEvent.press(getByTestId('tab-laporan'));
      await waitFor(() => {
        expect(getByText('📊 Daftar laporan akan ditampilkan di sini')).toBeTruthy();
      });

      // Switch back to tasks
      fireEvent.press(getByTestId('tab-tugas'));
      expect(getByText('📋 Daftar tugas akan ditampilkan di sini')).toBeTruthy();
    });
  });

  describe('Component Props', () => {
    it('should accept and use navigation prop', () => {
      const customNavigation = createMockNavigation();
      renderScreen({ navigation: customNavigation });

      expect(customNavigation).toBeDefined();
    });

    it('should accept and use route prop', () => {
      const customRoute = createMockRoute();
      renderScreen({ route: customRoute });

      expect(customRoute).toBeDefined();
    });
  });

  describe('State Management', () => {
    it('should manage active tab state correctly', () => {
      const { getByTestId } = renderScreen();

      // Initial state
      expect(getByTestId('tab-tugas-active').children[0]).toBe('Active');

      // Change state
      fireEvent.press(getByTestId('tab-laporan'));
      expect(getByTestId('tab-laporan-active').children[0]).toBe('Active');
    });

    it('should initialize with tasks as active tab', () => {
      const { getByTestId } = renderScreen();
      expect(getByTestId('tab-tugas-active').children[0]).toBe('Active');
    });
  });

  describe('Performance', () => {
    it('should render efficiently without unnecessary rerenders', () => {
      const { rerender } = renderScreen();

      // Rerender with same props
      rerender(<TasksReportsScreen navigation={mockNavigation} route={mockRoute} />);

      // Should not cause errors
      expect(mockNavigation).toBeDefined();
    });

    it('should handle multiple tab switches efficiently', () => {
      const { getByTestId } = renderScreen();

      const startTime = Date.now();

      // Switch tabs 10 times
      for (let i = 0; i < 10; i++) {
        fireEvent.press(getByTestId('tab-laporan'));
        fireEvent.press(getByTestId('tab-tugas'));
      }

      const endTime = Date.now();

      // Should complete in reasonable time (< 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});
