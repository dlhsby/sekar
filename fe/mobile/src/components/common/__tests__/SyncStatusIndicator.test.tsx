import React from 'react';
import { render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { SyncStatusIndicator } from '../SyncStatusIndicator';

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// Ensure Alert is mocked for test isolation
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

describe('SyncStatusIndicator Component', () => {
  it('should render online status', () => {
    const { getByText } = render(
      <SyncStatusIndicator isOnline={true} isSyncing={false} />
    );
    expect(getByText('Daring')).toBeTruthy();
  });

  it('should render offline status', () => {
    const { getByText } = render(
      <SyncStatusIndicator isOnline={false} isSyncing={false} />
    );
    expect(getByText('Luring')).toBeTruthy();
  });

  it('should render syncing status', () => {
    const { getByText } = render(
      <SyncStatusIndicator isOnline={true} isSyncing={true} />
    );
    expect(getByText('Menyinkronkan...')).toBeTruthy();
  });

  it('should show pending count when offline', () => {
    const { getByText } = render(
      <SyncStatusIndicator isOnline={false} isSyncing={false} pendingCount={5} />
    );
    expect(getByText('Luring (5)')).toBeTruthy();
  });

  it('should not show pending count when online', () => {
    const { queryByText, getByText } = render(
      <SyncStatusIndicator isOnline={true} isSyncing={false} pendingCount={5} />
    );
    expect(getByText('Daring')).toBeTruthy();
    expect(queryByText('(5)')).toBeNull();
  });

  it('should show offline without count when pendingCount is 0', () => {
    const { getByText } = render(
      <SyncStatusIndicator isOnline={false} isSyncing={false} pendingCount={0} />
    );
    expect(getByText('Luring')).toBeTruthy();
  });

  it('should prioritize syncing status over online/offline', () => {
    const { getByText, queryByText } = render(
      <SyncStatusIndicator isOnline={false} isSyncing={true} />
    );
    expect(getByText('Menyinkronkan...')).toBeTruthy();
    expect(queryByText('Luring')).toBeNull();
  });
});
