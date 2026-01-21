/**
 * Worker Navigator
 * Bottom tab navigation for worker role
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { WorkerTabParamList } from '../types/navigation.types';
import { colors } from '../constants/theme';
import { WorkerHomeScreen } from '../screens/worker/WorkerHomeScreen';
import { ClockInOutScreen } from '../screens/worker/ClockInOutScreen';
import { ReportSubmissionScreen } from '../screens/worker/ReportSubmissionScreen';
import { ReportsListScreen } from '../screens/worker/ReportsListScreen';
import { ProfileScreen } from '../screens/worker/ProfileScreen';

const Tab = createBottomTabNavigator<WorkerTabParamList>();

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
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="ClockInOut"
        component={ClockInOutScreen}
        options={{
          title: 'Absensi',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="clock-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Report"
        component={ReportSubmissionScreen}
        options={{
          title: 'Buat Laporan',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="file-document-edit"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="ReportsList"
        component={ReportsListScreen}
        options={{
          title: 'Laporan Saya',
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
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default WorkerNavigator;

