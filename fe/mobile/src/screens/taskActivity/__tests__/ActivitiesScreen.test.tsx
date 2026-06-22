/**
 * ActivitiesScreen Tests — standalone activities list (split from the former tabs).
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

jest.mock('../tabs/ActivitiesTab', () => {
  const { View, Text } = require('react-native');
  return { ActivitiesTab: () => <View><Text>ACTIVITIES_TAB</Text></View> };
});
jest.mock('../components/FilterBar', () => ({ FilterBar: () => null }));
jest.mock('../components/ScreenFABs', () => {
  const { Text } = require('react-native');
  return {
    ScreenFABs: ({ onSubmitActivity }: { onSubmitActivity: () => void }) => (
      <Text onPress={onSubmitActivity}>SUBMIT_ACTIVITY_FAB</Text>
    ),
  };
});
jest.mock('../../../components/modals', () => ({ ActivityFilterModal: () => null }));
jest.mock('../../../components/modals/SortModal', () => ({ SortModal: () => null }));

jest.mock('../hooks', () => ({
  useActivitiesActivityFilters: () => ({
    activityFilters: {},
    activeActivityFilterCount: 0,
    handleResetActivityFilters: jest.fn(),
    handleApplyActivityFilters: jest.fn(),
  }),
  useActivitiesFetching: () => ({
    allActivities: [],
    loadingActivities: false,
    isLoadingMoreActivities: false,
    hasMoreActivities: false,
    activitiesError: null,
    loadMoreActivities: jest.fn(),
    fetchActivities: jest.fn(),
  }),
}));

import { ActivitiesScreen } from '../ActivitiesScreen';

const makeStore = () =>
  configureStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture
    reducer: { auth: authReducer as any, shift: shiftReducer as any },
    preloadedState: {
      auth: {
        user: { id: 'u1', username: 'u', full_name: 'U', role: 'satgas' },
        token: 't', isAuthenticated: true, loading: false, error: null, assignedArea: null,
      } as any,
      shift: { currentShift: { area_id: 'a1' }, shiftHistory: [], isClockingIn: false, isClockingOut: false, error: null } as any,
    },
  });

const renderScreen = (navigate = jest.fn()) => {
  const utils = render(
    <Provider store={makeStore()}>
      <ActivitiesScreen navigation={{ navigate } as any} />
    </Provider>,
  );
  return { ...utils, navigate };
};

describe('ActivitiesScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the Aktivitas title and the activities list body', () => {
    const { getByText } = renderScreen();
    expect(getByText('Aktivitas')).toBeTruthy();
    expect(getByText('ACTIVITIES_TAB')).toBeTruthy();
  });

  it('navigates to ActivitySubmission from the FAB', () => {
    const { getByText, navigate } = renderScreen();
    fireEvent.press(getByText('SUBMIT_ACTIVITY_FAB'));
    expect(navigate).toHaveBeenCalledWith('ActivitySubmission');
  });
});
