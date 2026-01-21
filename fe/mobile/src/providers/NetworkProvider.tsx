/**
 * Network Provider
 * Monitors network connectivity and updates Redux offline state
 *
 * Listens to NetInfo changes and dispatches setOnlineStatus action to Redux
 */

import React, { useEffect, type ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAppDispatch } from '../store/store';
import { setOnlineStatus } from '../store/slices/offlineSlice';

interface NetworkProviderProps {
  children: ReactNode;
}

/**
 * NetworkProvider Component
 * Wraps the app to provide network state monitoring
 *
 * @param children - Child components to wrap
 */
export function NetworkProvider({ children }: NetworkProviderProps): JSX.Element {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = state.isConnected === true && state.isInternetReachable !== false;

      console.log('[NetworkProvider] Network state changed:', {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        isOnline,
      });

      dispatch(setOnlineStatus(isOnline));
    });

    // Get initial network state
    NetInfo.fetch().then((state) => {
      const isOnline = state.isConnected === true && state.isInternetReachable !== false;

      console.log('[NetworkProvider] Initial network state:', {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        isOnline,
      });

      dispatch(setOnlineStatus(isOnline));
    });

    // Cleanup: Unsubscribe on unmount
    return () => {
      unsubscribe();
    };
  }, [dispatch]);

  return <>{children}</>;
}

export default NetworkProvider;
