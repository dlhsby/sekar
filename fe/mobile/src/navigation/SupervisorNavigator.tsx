/**
 * Supervisor Navigator
 * Bottom tab navigation for supervisor role with stack navigation for reports
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { SupervisorTabParamList } from '../types/navigation.types';
import { colors } from '../constants/theme';

// Import screens
import ReportsListScreen from '../screens/supervisor/ReportsListScreen';
import ReportDetailScreen from '../screens/supervisor/ReportDetailScreen';
import { MapDashboardScreen, AttendanceScreen, ProfileScreen } from '../screens/supervisor';

const Tab = createBottomTabNavigator<SupervisorTabParamList>();
const Stack = createNativeStackNavigator();

/**
 * Reports Stack Navigator
 * Handles navigation between reports list and detail
 */
function ReportsStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ReportsListMain"
        component={ReportsListScreen}
        options={{ title: 'Laporan Kerja' }}
      />
      <Stack.Screen
        name="ReportDetail"
        component={ReportDetailScreen}
        options={{ title: 'Detail Laporan' }}
      />
    </Stack.Navigator>
  );
}

function SupervisorNavigator(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray500,
        headerShown: false,
      }}>
      <Tab.Screen
        name="MapDashboard"
        component={MapDashboardScreen}
        options={{
          title: 'Peta',
          headerShown: true,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="ReportsList"
        component={ReportsStackNavigator}
        options={{
          title: 'Laporan',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="file-document-multiple"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{
          title: 'Kehadiran',
          headerShown: true,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="clipboard-check"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profil',
          headerShown: true,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default SupervisorNavigator;

