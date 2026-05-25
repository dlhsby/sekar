/**
 * OnboardingNavigator — Phase 4 M3b
 *
 * Owns the 3-screen onboarding stack (OB-1 → OB-2 → OB-3). Slotted by
 * RootNavigator between auth and MainTabs when `!hasCompletedOnboarding(user.id)`.
 * Linear flow — header hidden, gestureEnabled disabled to keep users moving
 * forward.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingWelcomeScreen } from '../screens/onboarding/OnboardingWelcomeScreen';
import { OnboardingPermissionsScreen } from '../screens/onboarding/OnboardingPermissionsScreen';
import { OnboardingAreaPreviewScreen } from '../screens/onboarding/OnboardingAreaPreviewScreen';

const Stack = createNativeStackNavigator();

export function OnboardingNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
      }}
      initialRouteName="OnboardingWelcome"
    >
      <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcomeScreen} />
      <Stack.Screen
        name="OnboardingPermissions"
        component={OnboardingPermissionsScreen}
      />
      <Stack.Screen
        name="OnboardingAreaPreview"
        component={OnboardingAreaPreviewScreen}
      />
    </Stack.Navigator>
  );
}

export default OnboardingNavigator;
