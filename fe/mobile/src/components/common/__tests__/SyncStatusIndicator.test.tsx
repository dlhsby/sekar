import React from 'react';
import { render } from '@testing-library/react-native';
import { SyncStatusIndicator } from '../SyncStatusIndicator';

describe('SyncStatusIndicator Component', () => {
  it('should render online status', () => {
    const { getByText } = render(
      <SyncStatusIndicator isOnline={true} isSyncing={false} />
    );
    expect(getByText('Online')).toBeTruthy();
  });

  it('should render offline status', () => {
    const { getByText } = render(
      <SyncStatusIndicator isOnline={false} isSyncing={false} />
    );
    expect(getByText('Offline')).toBeTruthy();
  });

  it('should render syncing status', () => {
    const { getByText } = render(
      <SyncStatusIndicator isOnline={true} isSyncing={true} />
    );
    expect(getByText('Syncing...')).toBeTruthy();
  });

  it('should show pending count when offline', () => {
    const { getByText } = render(
      <SyncStatusIndicator isOnline={false} isSyncing={false} pendingCount={5} />
    );
    expect(getByText('Offline (5)')).toBeTruthy();
  });

  it('should not show pending count when online', () => {
    const { queryByText, getByText } = render(
      <SyncStatusIndicator isOnline={true} isSyncing={false} pendingCount={5} />
    );
    expect(getByText('Online')).toBeTruthy();
    expect(queryByText('(5)')).toBeNull();
  });

  it('should show offline without count when pendingCount is 0', () => {
    const { getByText } = render(
      <SyncStatusIndicator isOnline={false} isSyncing={false} pendingCount={0} />
    );
    expect(getByText('Offline')).toBeTruthy();
  });

  it('should prioritize syncing status over online/offline', () => {
    const { getByText, queryByText } = render(
      <SyncStatusIndicator isOnline={false} isSyncing={true} />
    );
    expect(getByText('Syncing...')).toBeTruthy();
    expect(queryByText('Offline')).toBeNull();
  });
});
