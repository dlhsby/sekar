/**
 * Worker Navigator
 * Bottom tab navigation for worker role
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { WorkerTabParamList } from '../types/navigation.types';
import { nbColors, nbBorders, nbShadows, nbTypography } from '../constants/nbTokens';
import { WorkerHomeScreen } from '../screens/worker/WorkerHomeScreen';
import { ClockInOutScreen } from '../screens/worker/ClockInOutScreen';
import { ReportSubmissionScreen } from '../screens/worker/ReportSubmissionScreen';
import { TasksReportsScreen } from '../screens/worker/TasksReportsScreen';
import { ProfileScreen } from '../screens/worker/ProfileScreen';
import { ShiftHistoryScreen } from '../screens/worker/ShiftHistoryScreen';
import { TaskDetailScreen } from '../screens/worker/TaskDetailScreen';
import { TaskCompleteScreen } from '../screens/worker/TaskCompleteScreen';
import ReportDetailScreen from '../screens/supervisor/ReportDetailScreen';
import { SettingsScreen } from '../screens/common/SettingsScreen';
import { WorkerHomeHeader } from '../components/navigation/WorkerHomeHeader';

const Tab = createBottomTabNavigator<WorkerTabParamList>();

function WorkerNavigator(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: nbColors.primary,
        tabBarInactiveTintColor: nbColors.gray[600],
        headerShown: true,
        headerStyle: {
          height: 76, // Further reduced for proportional balance
          backgroundColor: nbColors.white,
          borderBottomWidth: nbBorders.thick, // Neo Brutalism border
          borderBottomColor: nbColors.black,
          // Hard-edge shadow for Neo Brutalism
          ...nbShadows.md,
          elevation: 0, // Remove default Android elevation
        },
        headerTitleStyle: {
          fontSize: nbTypography.fontSize['2xl'],
          fontWeight: nbTypography.fontWeight.bold,
          color: nbColors.black,
        },
        headerTitleAlign: 'left' as const, // Align custom component to left
        headerTitleContainerStyle: {
          width: '100%', // Full width for custom component
          left: 0,
          right: 0,
        },
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        tabBarIconStyle: styles.tabBarIcon,
      }}>
      <Tab.Screen
        name="WorkerHome"
        component={WorkerHomeScreen}
        options={{
          headerTitle: () => <WorkerHomeHeader />,
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="ClockInOut"
        component={ClockInOutScreen}
        options={{
          headerTitle: () => <WorkerHomeHeader />,
          tabBarLabel: 'Absensi',
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
        options={({ navigation }) => ({
          title: 'Buat Laporan',
          headerLeft: () => (
            <MaterialCommunityIcons
              name="arrow-left"
              size={28}
              color={nbColors.black}
              onPress={() => navigation.goBack()}
              style={{ marginLeft: 16 }}
            />
          ),
          // Hidden from tab bar - accessed via buttons on Home or ReportsList
          tabBarButton: () => null,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="file-document-edit"
              color={color}
              size={size}
            />
          ),
        })}
      />
      <Tab.Screen
        name="TasksReports"
        component={TasksReportsScreen}
        options={{
          headerTitle: () => <WorkerHomeHeader />,
          tabBarLabel: 'Tugas & Laporan',
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
          headerTitle: () => <WorkerHomeHeader />,
          tabBarLabel: 'Profil',
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
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Pengaturan',
          // Hidden from tab bar - accessed via Profile menu
          tabBarButton: () => null,
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Neo Brutalism Tab Bar Styling
const styles = StyleSheet.create({
  tabBar: {
    height: 65, // Optimal height for icons + labels
    backgroundColor: nbColors.white, // White - matches top navigation
    borderTopWidth: nbBorders.thick, // 4px thick border - Neo Brutalism
    borderTopColor: nbColors.black,
    // Hard-edge shadow for Neo Brutalism
    ...nbShadows.md,
    paddingBottom: Platform.OS === 'ios' ? 4 : 4,
    paddingTop: 6,
  },
  tabBarLabel: {
    fontSize: nbTypography.fontSize.xs, // 12px
    fontWeight: nbTypography.fontWeight.semibold, // Bold labels
    marginTop: -2,
    marginBottom: 2,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
  tabBarIcon: {
    marginTop: 4,
  },
});

export default WorkerNavigator;

