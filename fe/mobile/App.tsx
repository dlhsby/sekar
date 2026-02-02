/**
 * SEKAR Mobile App
 * Main application entry point
 *
 * @format
 */

import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider, NetworkProvider } from './src/providers';
import { syncManager } from './src/services/sync';
import fcmService from './src/services/notifications/fcmService';
import { ErrorBoundary, PermissionRequestModal } from './src/components/common';
import { permissionManager } from './src/services/permissions';
import { locationTracker } from './src/services/location';
import { useAppSelector } from './src/store/hooks';

/**
 * Inner App component that initializes services after providers are set up
 */
function AppContent(): React.JSX.Element {
  const { isAuthenticated, isRestoring } = useAppSelector((state) => state.auth);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  useEffect(() => {
    // Initialize sync manager for offline queue processing
    syncManager.initialize();

    return () => {
      // Cleanup on unmount
      syncManager.cleanup();
    };
  }, []);

  /**
   * Check if we should show permission modal after auth restoration or login
   */
  useEffect(() => {
    const checkPermissions = async () => {
      if (isAuthenticated && !isRestoring) {
        const shouldShow = await permissionManager.shouldShowPermissionRequest();
        setShowPermissionModal(shouldShow);
      } else {
        setShowPermissionModal(false);
      }
    };

    checkPermissions();
  }, [isAuthenticated, isRestoring]);

  /**
   * Initialize FCM and LocationTracker after permissions are granted
   */
  const handlePermissionsComplete = async () => {
    setShowPermissionModal(false);

    // Initialize FCM service for push notifications after permissions granted
    try {
      await fcmService.initialize(store);
      console.log('[FCM] Service initialized successfully');
    } catch (error) {
      console.error('[FCM] Failed to initialize:', error);
    }

    // Start LocationTracker if there's an active shift
    try {
      const state = store.getState();
      const currentShift = state.shift.currentShift;
      const user = state.auth.user;

      if (currentShift?.id && user?.role === 'worker') {
        console.log('[App] Starting location tracking for active shift');
        await locationTracker.initialize(String(currentShift.id));
      }
    } catch (error) {
      console.error('[App] Failed to start location tracking:', error);
    }
  };

  return (
    <AuthProvider>
      <RootNavigator />
      <PermissionRequestModal
        visible={showPermissionModal}
        onComplete={handlePermissionsComplete}
        onSkip={handlePermissionsComplete}
      />
    </AuthProvider>
  );
}

function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <NetworkProvider>
          <AppContent />
        </NetworkProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
