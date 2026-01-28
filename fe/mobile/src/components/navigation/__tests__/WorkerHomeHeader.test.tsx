/**
 * WorkerHomeHeader Tests
 * Tests for the custom navigation header component
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { WorkerHomeHeader } from '../WorkerHomeHeader';
import authReducer from '../../../store/slices/authSlice';
import offlineReducer from '../../../store/slices/offlineSlice';

// Mock NBBadge component
jest.mock('../../../components/nb/NBBadge', () => ({
  NBBadge: ({ text }: any) => {
    const { Text } = require('react-native');
    return <Text>{text}</Text>;
  },
}));

const createMockStore = (authState = {}, offlineState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      offline: offlineReducer,
    },
    preloadedState: {
      auth: {
        user: null,
        assignedArea: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        ...authState,
      },
      offline: {
        isOnline: true,
        isSyncing: false,
        pendingCount: 0,
        ...offlineState,
      },
    },
  });
};

describe('WorkerHomeHeader', () => {
  it('renders greeting with user name', () => {
    const store = createMockStore({
      user: { id: '1', full_name: 'John Doe', username: 'john', role: 'Worker' },
    });

    const { getByText } = render(
      <Provider store={store}>
        <WorkerHomeHeader />
      </Provider>
    );

    expect(getByText('Halo, John Doe! 👋')).toBeTruthy();
    expect(getByText('Pekerja')).toBeTruthy(); // Role badge
  });

  it('shows online indicator when online', () => {
    const store = createMockStore(
      { user: { id: '1', full_name: 'John', username: 'john', role: 'Worker' } },
      { isOnline: true }
    );

    const { getByText } = render(
      <Provider store={store}>
        <WorkerHomeHeader />
      </Provider>
    );

    expect(getByText('Online')).toBeTruthy();
  });

  it('shows offline indicator when offline', () => {
    const store = createMockStore(
      { user: { id: '1', full_name: 'John', username: 'john', role: 'Worker' } },
      { isOnline: false }
    );

    const { getByText } = render(
      <Provider store={store}>
        <WorkerHomeHeader />
      </Provider>
    );

    expect(getByText('Offline')).toBeTruthy();
  });

  it('shows syncing indicator when syncing', () => {
    const store = createMockStore(
      { user: { id: '1', full_name: 'John', username: 'john', role: 'Worker' } },
      { isOnline: true, isSyncing: true }
    );

    const { getByText } = render(
      <Provider store={store}>
        <WorkerHomeHeader />
      </Provider>
    );

    expect(getByText('Syncing')).toBeTruthy();
  });

  it('shows pending count when not syncing but has pending items', () => {
    const store = createMockStore(
      { user: { id: '1', full_name: 'John', username: 'john', role: 'Worker' } },
      { isOnline: true, isSyncing: false, pendingCount: 5 }
    );

    const { getByText } = render(
      <Provider store={store}>
        <WorkerHomeHeader />
      </Provider>
    );

    expect(getByText('5')).toBeTruthy();
  });
});
