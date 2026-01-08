/**
 * Worker Navigator
 * Bottom tab navigation for worker role
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { WorkerTabParamList } from '../types/navigation.types';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

const Tab = createBottomTabNavigator<WorkerTabParamList>();

// Placeholder screens (to be implemented)
function WorkerHomeScreen() {
  return (
    <View style={styles.container}>
      <Text>Worker Home Screen</Text>
    </View>
  );
}

function ClockInOutScreen() {
  return (
    <View style={styles.container}>
      <Text>Clock In/Out Screen</Text>
    </View>
  );
}

function ReportScreen() {
  return (
    <View style={styles.container}>
      <Text>Report Screen</Text>
    </View>
  );
}

function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text>Profile Screen</Text>
    </View>
  );
}

function WorkerNavigator(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray500,
        headerShown: true,
      }}>
      <Tab.Screen 
        name="WorkerHome" 
        component={WorkerHomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="ClockInOut"
        component={ClockInOutScreen}
        options={{ title: 'Absensi' }}
      />
      <Tab.Screen
        name="Report"
        component={ReportScreen}
        options={{ title: 'Laporan' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profil' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default WorkerNavigator;

