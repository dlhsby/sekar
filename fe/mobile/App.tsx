/**
 * SEKAR Mobile App
 * Main application entry point
 *
 * @format
 */

import { initSentry } from './src/services/crashReporting/sentry';
// Initialize Sentry as early as possible so init-time errors are captured.
initSentry();
import React, { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider, NetworkProvider } from './src/providers';
import { syncManager } from './src/services/sync';
import { connectivityMonitor } from './src/services/sync/connectivityMonitor.instance';
import { ConnectivityBanner } from './src/components/common/ConnectivityBanner';
import fcmService from './src/services/notifications/fcmService';
import { NBToastProvider } from './src/components/nb';
import {
  ErrorBoundary,
  PermissionRevocationBanner,
} from './src/components/common';
import { locationTracker } from './src/services/location';
import { useAppSelector } from './src/store/hooks';

/**
 * Inner App component that initializes services after providers are set up
 */
function AppContent(): React.JSX.Element {
  const { isAuthenticated, isRestoring } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Initialize sync manager for offline queue processing
    syncManager.initialize();
    // Phase 4-2 (M2): start three-state connectivity monitor.
    connectivityMonitor.start();

    return () => {
      // Cleanup on unmount
      syncManager.cleanup();
      connectivityMonitor.stop();
    };
  }, []);

  /**
   * On auth-ready: bootstrap FCM (idempotent) + register the token under the
   * current user, and start location tracking if a shift is active. Permission
   * priming is owned by the OB-2 onboarding screen — there is no startup modal.
   */
  useEffect(() => {
    const onAuthReady = async () => {
      if (isAuthenticated && !isRestoring) {
        try {
          await fcmService.initialize(store);
          // Re-register the token after auth-ready so the backend's
          // device_tokens row tracks the CURRENT user (e.g. after
          // logout-then-login-as-other). initialize() is idempotent.
          const token = await fcmService.getToken();
          if (token) {
            await fcmService.registerToken(token);
          }
        } catch (err) {
          console.warn('[FCM] Post-auth bootstrap failed:', err);
        }

        try {
          const state = store.getState();
          const currentShift = state.shift.currentShift;
          if (currentShift?.id && state.auth.user?.role) {
            await locationTracker.initialize(String(currentShift.id));
          }
        } catch (err) {
          console.error('[App] Failed to start location tracking:', err);
        }
      } else if (!isAuthenticated && !isRestoring) {
        // On logout, tear down FCM so the next login re-initializes + re-registers.
        fcmService.cleanup();
      }
    };

    onAuthReady();
  }, [isAuthenticated, isRestoring]);

  // May 13 — re-register FCM token on every foreground transition while
  // authenticated. Catches the case where the token was invalidated
  // server-side (Firebase returned `registration-token-not-registered`
  // for a push) while the app was backgrounded. Without this, the user
  // is silently missing notifications until they log out + back in.
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastRegisteredTokenRef = useRef<string | null>(null);
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (prev.match(/inactive|background/) && next === 'active' && isAuthenticated) {
        try {
          const token = await fcmService.getToken();
          // May 13 — idempotency: skip the backend POST if the FCM
          // token hasn't changed since the last register. Without this
          // guard, a user who background-foregrounds the app several
          // times per minute would hammer /devices each time.
          if (token && token !== lastRegisteredTokenRef.current) {
            await fcmService.registerToken(token);
            lastRegisteredTokenRef.current = token;
          }
        } catch (err) {
          console.warn('[FCM] Foreground re-register failed:', err);
        }
      }
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  return (
    <AuthProvider>
      {/* Phase 4-2 (M2): three-state ConnectivityBanner sits above the
          navigator so it persists across screen transitions. */}
      <ConnectivityBanner monitor={connectivityMonitor} />
      {/* Phase 4 M3a+b — runtime re-check for revoked permissions. The
          OB-2 onboarding handles first-install grants; this banner handles
          the case where a logged-in user revokes a permission later from
          system Settings. Hook re-evaluates on every foreground transition. */}
      <PermissionRevocationBanner enabled={isAuthenticated && !isRestoring} />
      <RootNavigator />
      {/* Global toast renderer — replaces ad-hoc Alert/inline NBAlert usage. */}
      <NBToastProvider />
    </AuthProvider>
  );
}

function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <Provider store={store}>
          <NetworkProvider>
            <AppContent />
          </NetworkProvider>
        </Provider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

export default App;
