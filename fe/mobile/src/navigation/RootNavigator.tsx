/**
 * Root Navigator
 * Phase 2C: unified navigator for all 8 roles (no Worker/Supervisor split)
 */

import React, { useEffect, useRef } from 'react';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation.types';
import { useAppSelector } from '../store/hooks';
import fcmService from '../services/notifications/fcmService';

import LoginScreen from '../screens/auth/LoginScreen';
import MainNavigator from './MainNavigator';
// Phase 4 M3a+b — entry flow gates
import SplashScreen from '../screens/auth/SplashScreen';
import WelcomeCarouselScreen from '../screens/auth/WelcomeCarouselScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ChangePasswordScreen from '../screens/auth/ChangePasswordScreen';
import OnboardingNavigator from './OnboardingNavigator';
import { hasCompletedOnboarding } from '../services/storage/asyncStorageKeys';

const Stack = createNativeStackNavigator<RootStackParamList>();

// May 13 — exported nav ref so non-component code (FCM deep-link
// handler) can navigate without prop-drilling. NavigationContainer
// installs its bindings as soon as it mounts; the deep-link effect
// below uses `navigationRef.isReady()` before any navigate() call.
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

function deepLinkFromNotificationData(data: Record<string, unknown> | undefined): void {
  if (!data || !navigationRef.isReady()) return;
  const taskId = typeof data.task_id === 'string' ? data.task_id : undefined;
  const pruningRequestId =
    typeof data.pruning_request_id === 'string' ? data.pruning_request_id : undefined;

  // Task wins over pruning_request when both are present (the task
  // detail screen has a `from` param to step back to the request).
  if (taskId) {
    (navigationRef.navigate as (...a: unknown[]) => void)('MainTabs', {
      screen: 'TaskDetail',
      params: { taskId, from: 'Notification' },
    });
    return;
  }
  if (pruningRequestId) {
    (navigationRef.navigate as (...a: unknown[]) => void)('MainTabs', {
      screen: 'PruningDetail',
      params: { requestId: pruningRequestId },
    });
  }
}

// Phase 3 Apr 27 — staff_kecamatan now flows through MainNavigator like every other
// role. The dedicated KecamatanNavigator (no bottom tabs, stack-only) is removed
// in favor of a 2-tab layout (Perantingan + Profile) matching the rest of the app.
function RootNavigator(): React.JSX.Element {
  const { isAuthenticated, user, onboardingCompleted } = useAppSelector((state) => state.auth);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Phase 4 M3a+b — onboarding gate. Default to `true` (i.e., "skip onboarding")
  // so the synchronous first render lands on the post-gate flow. The async storage
  // probe flips it only when needed, which causes a one-tick re-render on first
  // login — acceptable tradeoff for test stability (no async setup required in
  // 50+ existing test files).
  const [onboardingDone, setOnboardingDone] = React.useState<boolean>(true);

  useEffect(() => {
    if (!user?.id) {
      setOnboardingDone(true);
      return;
    }
    hasCompletedOnboarding(user.id)
      .then(setOnboardingDone)
      .catch(() => setOnboardingDone(true)); // fail-open
  }, [user?.id]);

  // May 13 — wire up deep-linking from push notifications. Two paths:
  // (1) onNotificationOpened: user tapped a tray notification while app
  //     was in background. Fires every time, so subscribe ONCE.
  // (2) getInitialNotification: user tapped a tray notification while
  //     app was fully terminated. Fires only on the first cold-start
  //     after the tap, so we await it inside the same effect.
  useEffect(() => {
    if (!isAuthenticated) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      return;
    }
    const unsubscribe = fcmService.onNotificationOpened((n) => {
      deepLinkFromNotificationData(n.data);
    });
    cleanupRef.current = unsubscribe;
    fcmService
      .getInitialNotification()
      .then((n) => {
        if (n) deepLinkFromNotificationData(n.data);
      })
      .catch((err) => console.warn('[FCM] getInitialNotification failed:', err));
    return () => {
      unsubscribe();
      cleanupRef.current = null;
    };
  }, [isAuthenticated]);

  // Gate precedence (Phase 4 M3a+b):
  //   1. !isAuthenticated/!user → unauthenticated stack: Splash (initial) →
  //      WelcomeCarousel → Login → ForgotPassword. The branded splash + carousel
  //      always lead the logged-out flow; "Masuk"/"Lewati" route on to Login.
  //   2. user.password_must_change → ChangePassword (forced, no back)
  //   3. !onboardingDone        → Onboarding stack
  //   4. otherwise              → MainTabs (logged-in users skip splash/carousel
  //      entirely and land on Home directly).
  const loggedIn = isAuthenticated && !!user;
  const forceChange = loggedIn && user?.password_must_change === true;
  const showOnboarding =
    loggedIn && !forceChange && !onboardingDone && !onboardingCompleted;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!loggedIn ? (
          <>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="WelcomeCarousel" component={WelcomeCarouselScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
          </>
        ) : forceChange ? (
          <Stack.Screen
            name="ChangePassword"
            component={ChangePasswordScreen}
            options={{ gestureEnabled: false }}
          />
        ) : showOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : (
          <Stack.Screen name="MainTabs" component={MainNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default RootNavigator;
