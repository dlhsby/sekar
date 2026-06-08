/**
 * Network Provider
 * Monitors network connectivity and updates Redux offline state
 *
 * Listens to NetInfo changes and dispatches setOnlineStatus action to Redux
 */

import React, { useEffect, useRef, type ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAppDispatch } from '../store/store';
import { setOnlineStatus } from '../store/slices/offlineSlice';
import { syncManager } from '../services/sync';

interface NetworkProviderProps {
  children: ReactNode;
}

/**
 * NetworkProvider Component
 * Wraps the app to provide network state monitoring
 *
 * @param children - Child components to wrap
 */
export function NetworkProvider({ children }: NetworkProviderProps): React.ReactElement {
  const dispatch = useAppDispatch();
  const previousOnlineStatus = useRef<boolean | null>(null);

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected === true && state.isInternetReachable !== false;

      console.debug('[NetworkProvider] Network state changed:', {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        isOnline,
      });

      dispatch(setOnlineStatus(isOnline));

      // Trigger sync when transitioning from offline to online
      if (previousOnlineStatus.current === false && isOnline) {
        console.debug('[NetworkProvider] Network restored - triggering sync');
        syncManager.forceSyncNow();
      }

      previousOnlineStatus.current = isOnline;
    });

    // Get initial network state
    NetInfo.fetch().then((state) => {
      const isOnline = state.isConnected === true && state.isInternetReachable !== false;

      console.debug('[NetworkProvider] Initial network state:', {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        isOnline,
      });

      dispatch(setOnlineStatus(isOnline));
      previousOnlineStatus.current = isOnline;

      // Trigger initial sync if online
      if (isOnline) {
        console.debug('[NetworkProvider] Initial online state - triggering sync');
        syncManager.forceSyncNow();
      }
    });

    // Cleanup: Unsubscribe on unmount
    return () => {
      unsubscribe();
    };
  }, [dispatch]);

  return <>{children}</>;
}

export default NetworkProvider;
