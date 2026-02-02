/**
 * NetworkProvider Tests
 * Tests for NetInfo listener cleanup and network status updates
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { View, Text, Alert } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import NetInfo from '@react-native-community/netinfo';
import { NetworkProvider } from '../NetworkProvider';
import offlineReducer from '../../store/slices/offlineSlice';
import { syncManager } from '../../services/sync';

// Mock Alert (must be before any imports that use it)
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(),
}));

// Mock sync manager
jest.mock('../../services/sync', () => ({
  syncManager: {
    syncNow: jest.fn(),
  },
}));

// Mock console methods to reduce test output noise
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('NetworkProvider', () => {
  let store: any;
  let unsubscribeMock: jest.Mock;
  let addEventListenerMock: jest.Mock;

  beforeEach(() => {
    unsubscribeMock = jest.fn();
    addEventListenerMock = jest.fn().mockReturnValue(unsubscribeMock);

    (NetInfo.addEventListener as jest.Mock) = addEventListenerMock;
    (NetInfo.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });

    (syncManager.syncNow as jest.Mock).mockResolvedValue(undefined);

    // Create store
    store = configureStore({
      reducer: {
        offline: offlineReducer,
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  it('should listen to NetInfo on mount', async () => {
    render(
      <Provider store={store}>
        <NetworkProvider>
          <View>
            <Text>Test Content</Text>
          </View>
        </NetworkProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(addEventListenerMock).toHaveBeenCalledWith(expect.any(Function));
    });

    expect(NetInfo.fetch).toHaveBeenCalled();
  });

  it('should dispatch setOnlineStatus when network changes to online', async () => {
    let networkChangeCallback: any;

    addEventListenerMock.mockImplementation((callback) => {
      networkChangeCallback = callback;
      return unsubscribeMock;
    });

    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
    });

    render(
      <Provider store={store}>
        <NetworkProvider>
          <View>
            <Text>Test Content</Text>
          </View>
        </NetworkProvider>
      </Provider>
    );

    // Wait for initial fetch
    await waitFor(() => {
      expect(store.getState().offline.isOnline).toBe(false);
    });

    // Simulate network change to online
    act(() => {
      networkChangeCallback({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });
    });

    await waitFor(() => {
      expect(store.getState().offline.isOnline).toBe(true);
    });

    // Should trigger sync when going from offline to online
    expect(syncManager.syncNow).toHaveBeenCalled();
  });

  it('should dispatch setOnlineStatus when network changes to offline', async () => {
    let networkChangeCallback: any;

    addEventListenerMock.mockImplementation((callback) => {
      networkChangeCallback = callback;
      return unsubscribeMock;
    });

    render(
      <Provider store={store}>
        <NetworkProvider>
          <View>
            <Text>Test Content</Text>
          </View>
        </NetworkProvider>
      </Provider>
    );

    // Wait for initial online state
    await waitFor(() => {
      expect(store.getState().offline.isOnline).toBe(true);
    });

    // Simulate network change to offline
    act(() => {
      networkChangeCallback({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });
    });

    await waitFor(() => {
      expect(store.getState().offline.isOnline).toBe(false);
    });
  });

  it('should clean up listener on unmount', async () => {
    const { unmount } = render(
      <Provider store={store}>
        <NetworkProvider>
          <View>
            <Text>Test Content</Text>
          </View>
        </NetworkProvider>
      </Provider>
    );

    // Wait for component to mount
    await waitFor(() => {
      expect(addEventListenerMock).toHaveBeenCalled();
    });

    // Unmount
    unmount();

    // Verify unsubscribe was called
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('should handle both online and offline states correctly', async () => {
    let networkChangeCallback: any;

    addEventListenerMock.mockImplementation((callback) => {
      networkChangeCallback = callback;
      return unsubscribeMock;
    });

    render(
      <Provider store={store}>
        <NetworkProvider>
          <View>
            <Text>Test Content</Text>
          </View>
        </NetworkProvider>
      </Provider>
    );

    // Wait for initial state
    await waitFor(() => {
      expect(store.getState().offline.isOnline).toBe(true);
    });

    // Test offline state
    act(() => {
      networkChangeCallback({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });
    });

    await waitFor(() => {
      expect(store.getState().offline.isOnline).toBe(false);
    });

    // Test online state again
    act(() => {
      networkChangeCallback({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });
    });

    await waitFor(() => {
      expect(store.getState().offline.isOnline).toBe(true);
    });
  });

  it('should handle null isConnected as offline', async () => {
    let networkChangeCallback: any;

    addEventListenerMock.mockImplementation((callback) => {
      networkChangeCallback = callback;
      return unsubscribeMock;
    });

    render(
      <Provider store={store}>
        <NetworkProvider>
          <View>
            <Text>Test Content</Text>
          </View>
        </NetworkProvider>
      </Provider>
    );

    // Wait for initial state
    await waitFor(() => {
      expect(addEventListenerMock).toHaveBeenCalled();
    });

    // Simulate null isConnected (unknown state)
    act(() => {
      networkChangeCallback({ isConnected: null, isInternetReachable: null });
    });

    await waitFor(() => {
      expect(store.getState().offline.isOnline).toBe(false);
    });
  });

  it('should not cause memory leaks on rapid mount/unmount', async () => {
    const { unmount, rerender } = render(
      <Provider store={store}>
        <NetworkProvider>
          <View>
            <Text>Test Content</Text>
          </View>
        </NetworkProvider>
      </Provider>
    );

    // Wait for initial mount
    await waitFor(() => {
      expect(addEventListenerMock).toHaveBeenCalled();
    });

    // Remount multiple times
    for (let i = 0; i < 5; i++) {
      rerender(
        <Provider store={store}>
          <NetworkProvider>
            <View>
              <Text>Test Content {i}</Text>
            </View>
          </NetworkProvider>
        </Provider>
      );
    }

    unmount();

    // Should have called addEventListener once (not on rerenders)
    expect(addEventListenerMock).toHaveBeenCalledTimes(1);
    // Should clean up on unmount
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('should handle rapid network state changes', async () => {
    let networkChangeCallback: any;

    addEventListenerMock.mockImplementation((callback) => {
      networkChangeCallback = callback;
      return unsubscribeMock;
    });

    render(
      <Provider store={store}>
        <NetworkProvider>
          <View>
            <Text>Test Content</Text>
          </View>
        </NetworkProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(addEventListenerMock).toHaveBeenCalled();
    });

    // Rapid changes
    act(() => {
      networkChangeCallback({ isConnected: false, isInternetReachable: false });
      networkChangeCallback({ isConnected: true, isInternetReachable: true });
      networkChangeCallback({ isConnected: false, isInternetReachable: false });
      networkChangeCallback({ isConnected: true, isInternetReachable: true });
    });

    // Final state should be online
    await waitFor(() => {
      expect(store.getState().offline.isOnline).toBe(true);
    });
  });

  it('should trigger sync on initial mount if online', async () => {
    render(
      <Provider store={store}>
        <NetworkProvider>
          <View>
            <Text>Test Content</Text>
          </View>
        </NetworkProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(syncManager.syncNow).toHaveBeenCalled();
    });
  });

  it('should not trigger sync on initial mount if offline', async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
    });

    render(
      <Provider store={store}>
        <NetworkProvider>
          <View>
            <Text>Test Content</Text>
          </View>
        </NetworkProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(store.getState().offline.isOnline).toBe(false);
    });

    expect(syncManager.syncNow).not.toHaveBeenCalled();
  });

  it('should handle sync errors gracefully', async () => {
    let networkChangeCallback: any;

    addEventListenerMock.mockImplementation((callback) => {
      networkChangeCallback = callback;
      return unsubscribeMock;
    });

    (syncManager.syncNow as jest.Mock).mockRejectedValue(new Error('Sync failed'));
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: false,
      isInternetReachable: false,
      type: 'none',
    });

    render(
      <Provider store={store}>
        <NetworkProvider>
          <View>
            <Text>Test Content</Text>
          </View>
        </NetworkProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(store.getState().offline.isOnline).toBe(false);
    });

    // Transition from offline to online (should trigger sync)
    act(() => {
      networkChangeCallback({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });
    });

    await waitFor(() => {
      expect(store.getState().offline.isOnline).toBe(true);
    });

    // Sync error should be logged but not crash the app
    await waitFor(() => {
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[NetworkProvider] Sync after reconnect failed:',
        expect.any(Error)
      );
    });
  });

  it('should treat connected but no internet as offline', async () => {
    let networkChangeCallback: any;

    addEventListenerMock.mockImplementation((callback) => {
      networkChangeCallback = callback;
      return unsubscribeMock;
    });

    render(
      <Provider store={store}>
        <NetworkProvider>
          <View>
            <Text>Test Content</Text>
          </View>
        </NetworkProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(addEventListenerMock).toHaveBeenCalled();
    });

    // Connected to wifi but no internet
    act(() => {
      networkChangeCallback({
        isConnected: true,
        isInternetReachable: false,
        type: 'wifi',
      });
    });

    await waitFor(() => {
      expect(store.getState().offline.isOnline).toBe(false);
    });
  });
});
