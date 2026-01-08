/**
 * Supervisor Navigator
 * Bottom tab navigation for supervisor role
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { SupervisorTabParamList } from '../types/navigation.types';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

const Tab = createBottomTabNavigator<SupervisorTabParamList>();

// Placeholder screens (to be implemented)
function MapDashboardScreen() {
  return (
    <View style={styles.container}>
      <Text>Map Dashboard Screen</Text>
    </View>
  );
}

function ReportsListScreen() {
  return (
    <View style={styles.container}>
      <Text>Reports List Screen</Text>
    </View>
  );
}

function AttendanceScreen() {
  return (
    <View style={styles.container}>
      <Text>Attendance Screen</Text>
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

function SupervisorNavigator(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray500,
        headerShown: true,
      }}>
      <Tab.Screen
        name="MapDashboard"
        component={MapDashboardScreen}
        options={{ title: 'Peta' }}
      />
      <Tab.Screen
        name="ReportsList"
        component={ReportsListScreen}
        options={{ title: 'Laporan' }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{ title: 'Kehadiran' }}
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

export default SupervisorNavigator;

