/**
 * Network Status Hook
 * Provides real-time network connectivity status
 * Phase 3: Used by pruning requests and offline sync
 */

import { useEffect, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

interface NetworkStatus {
  isOnline: boolean;
  isConnected: boolean;
  type: string | null;
}

/**
 * Hook to track network connectivity status
 * Returns whether device is currently online
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: true, // Assume online by default
    isConnected: true,
    type: null,
  });

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeNetInfo = async () => {
      try {
        // Get current state
        const currentState = await NetInfo.fetch();
        setStatus({
          isOnline: currentState.isConnected || false,
          isConnected: currentState.isConnected || false,
          type: currentState.type || null,
        });

        // Subscribe to changes
        unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
          setStatus({
            isOnline: state.isConnected || false,
            isConnected: state.isConnected || false,
            type: state.type || null,
          });
        });
      } catch (error) {
        console.error('[useNetworkStatus] Error initializing NetInfo:', error);
        // Assume online on error
        setStatus({ isOnline: true, isConnected: true, type: null });
      }
    };

    initializeNetInfo();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return status;
}

export default useNetworkStatus;
