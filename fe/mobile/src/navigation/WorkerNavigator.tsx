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
import { TasksReportsScreen } from '../screens/worker/TasksReportsScreen';
import { ProfileScreen } from '../screens/worker/ProfileScreen';
import { ShiftHistoryScreen } from '../screens/worker/ShiftHistoryScreen';
import { TaskDetailScreen } from '../screens/worker/TaskDetailScreen';
import { TaskCompleteScreen } from '../screens/worker/TaskCompleteScreen';
import ReportDetailScreen from '../screens/supervisor/ReportDetailScreen';

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
          // Hidden from tab bar - accessed via buttons on Home or ReportsList
          tabBarButton: () => null,
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
        name="TasksReports"
        component={TasksReportsScreen}
        options={{
          title: 'Tugas & Laporan',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="clipboard-text-multiple"
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
      <Tab.Screen
        name="ShiftHistory"
        component={ShiftHistoryScreen}
        options={{
          title: 'Riwayat Shift',
          // Hidden from tab bar - accessed via Profile menu
          tabBarButton: () => null,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="history"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="ReportDetail"
        component={ReportDetailScreen}
        options={{
          title: 'Detail Laporan',
          // Hidden from tab bar - accessed via ReportsList
          tabBarButton: () => null,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="file-document"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{
          title: 'Detail Tugas',
          // Hidden from tab bar - accessed via WorkerHome tasks list
          tabBarButton: () => null,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="clipboard-text"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tab.Screen
        name="TaskComplete"
        component={TaskCompleteScreen}
        options={{
          title: 'Selesaikan Tugas',
          // Hidden from tab bar - accessed via TaskDetail
          tabBarButton: () => null,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="clipboard-check"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default WorkerNavigator;

