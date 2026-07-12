/**
 * TasksScreen Tests — standalone tasks list (split from the former tabs).
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../../store/slices/authSlice';
import shiftReducer from '../../../store/slices/shiftSlice';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('../tabs/TasksTab', () => {
  const { View, Text } = require('react-native');
  return { TasksTab: () => <View><Text>TASKS_TAB</Text></View> };
});
jest.mock('../../../components/common/FilterBar', () => ({ FilterBar: () => null }));
jest.mock('../components/ScreenFABs', () => {
  const { Text } = require('react-native');
  return {
    ScreenFABs: ({ onCreateTask }: { onCreateTask: () => void }) => (
      <Text onPress={onCreateTask}>CREATE_TASK_FAB</Text>
    ),
  };
});
jest.mock('../../../components/modals', () => ({ TaskFilterModal: () => null }));
jest.mock('../../../components/modals/SortModal', () => ({ SortModal: () => null }));

jest.mock('../hooks', () => ({
  useTasksActivityFilters: () => ({
    taskFilter: 'all',
    statusFilter: null,
    dateFrom: null,
    dateTo: null,
    createdFrom: null,
    createdTo: null,
    petugasFilter: null,
    rayonFilter: null,
    areaFilter: null,
    activeFilterCount: 0,
    handleResetFilters: jest.fn(),
    handleApplyFilters: jest.fn(),
  }),
  useTasksFetching: () => ({
    allTasks: [],
    loadingTasks: false,
    isLoadingMoreTasks: false,
    hasMoreTasks: false,
    tasksError: null,
    loadMoreTasks: jest.fn(),
    fetchTasks: jest.fn(),
  }),
}));

import { TasksScreen } from '../TasksScreen';

const makeStore = () =>
  configureStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture
    reducer: { auth: authReducer as any, shift: shiftReducer as any },
    preloadedState: {
      auth: {
        user: { id: 'u1', username: 'u', full_name: 'U', role: 'satgas' },
        token: 't', isAuthenticated: true, loading: false, error: null, assignedArea: null,
      } as any,
      shift: { currentShift: { location_id: 'a1' }, shiftHistory: [], isClockingIn: false, isClockingOut: false, error: null } as any,
    },
  });

const renderScreen = (navigate = jest.fn()) => {
  const utils = render(
    <Provider store={makeStore()}>
      <TasksScreen navigation={{ navigate } as any} />
    </Provider>,
  );
  return { ...utils, navigate };
};

describe('TasksScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the tasks list body', () => {
    const { getByText } = renderScreen();
    expect(getByText('TASKS_TAB')).toBeTruthy();
  });

  it('navigates to TaskCreate from the FAB', () => {
    const { getByText, navigate } = renderScreen();
    fireEvent.press(getByText('CREATE_TASK_FAB'));
    expect(navigate).toHaveBeenCalledWith('TaskCreate');
  });
});
