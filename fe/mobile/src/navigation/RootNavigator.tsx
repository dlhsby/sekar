/**
 * Root Navigator
 * Main navigation setup for the app
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation.types';
import { useAppSelector } from '../store/hooks';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import WorkerNavigator from './WorkerNavigator';
import SupervisorNavigator from './SupervisorNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator(): React.JSX.Element {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}>
        {!isAuthenticated || !user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user.role === 'worker' ? (
          <Stack.Screen name="WorkerTabs" component={WorkerNavigator} />
        ) : (
          <Stack.Screen name="SupervisorTabs" component={SupervisorNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default RootNavigator;

