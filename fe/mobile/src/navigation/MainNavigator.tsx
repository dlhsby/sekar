/**
 * Main Navigator
 * Unified bottom tab + stack navigation for all 8 roles
 * Phase 2C: replaces WorkerNavigator + SupervisorNavigator
 */

import React, { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MainTabParamList } from '../types/navigation.types';
import type { UserRole } from '../types/models.types';
import { nbColors, nbBorders, nbShadows, nbTypography } from '../constants/nbTokens';
import { useAppSelector } from '../store/hooks';
import { FieldHomeHeader } from '../components/navigation/FieldHomeHeader';

// Field screens (clockable roles)
import { HomeScreen } from '../screens/field/HomeScreen';
import { ClockInOutScreen } from '../screens/field/ClockInOutScreen';
import { ActivitySubmissionScreen } from '../screens/field/ActivitySubmissionScreen';
import { TasksActivityScreen } from '../screens/field/TasksActivityScreen';
import { TaskDetailScreen } from '../screens/field/TaskDetailScreen';
import { TaskCompleteScreen } from '../screens/field/TaskCompleteScreen';
import { ShiftHistoryScreen } from '../screens/field/ShiftHistoryScreen';
import { ActivityDetailScreen } from '../screens/field/ActivityDetailScreen';
// Monitoring screens (used by korlap, kepala_rayon, top management, admin roles)
import { MapDashboardScreen } from '../screens/monitoring/MapDashboardScreen';
import { default as AttendanceScreen } from '../screens/monitoring/AttendanceScreen';

// Unified profile screen (all roles)
import { ProfileScreen } from '../screens/common/ProfileScreen';

// Overtime screens
import { OvertimeListScreen } from '../screens/overtime/OvertimeListScreen';
import { OvertimeSubmitScreen } from '../screens/overtime/OvertimeSubmitScreen';
import { OvertimeDetailScreen } from '../screens/overtime/OvertimeDetailScreen';
import { OvertimeApprovalScreen } from '../screens/overtime/OvertimeApprovalScreen';

// Task creation screen
import { TaskCreateScreen } from '../screens/tasks/TaskCreateScreen';

// Common screens
import { SettingsScreen } from '../screens/common/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

interface TabConfig {
  name: keyof MainTabParamList;
  label: string;
  icon: string;
}

export const TAB_CONFIGS: Record<string, TabConfig[]> = {
  satgas: [
    { name: 'Home', label: 'Beranda', icon: 'home' },
    { name: 'TasksActivities', label: 'Tugas & Aktivitas', icon: 'clipboard-list-outline' },
    { name: 'Overtime', label: 'Lembur', icon: 'clock-plus-outline' },
    { name: 'Profile', label: 'Profil', icon: 'account' },
  ],
  linmas: [
    { name: 'Home', label: 'Beranda', icon: 'home' },
    { name: 'TasksActivities', label: 'Tugas & Aktivitas', icon: 'clipboard-list-outline' },
    { name: 'Overtime', label: 'Lembur', icon: 'clock-plus-outline' },
    { name: 'Profile', label: 'Profil', icon: 'account' },
  ],
  korlap: [
    { name: 'Home', label: 'Beranda', icon: 'home' },
    { name: 'Monitoring', label: 'Monitoring', icon: 'map' },
    { name: 'TasksActivities', label: 'Tugas', icon: 'clipboard-check' },
    { name: 'Overtime', label: 'Lembur', icon: 'clock-plus-outline' },
    { name: 'Profile', label: 'Profil', icon: 'account' },
  ],
  admin_data: [
    { name: 'Home', label: 'Beranda', icon: 'home' },
    { name: 'TasksActivities', label: 'Tugas & Aktivitas', icon: 'clipboard-list-outline' },
    { name: 'Monitoring', label: 'Monitoring', icon: 'chart-bar' },
    { name: 'Overtime', label: 'Lembur', icon: 'clock-outline' },
    { name: 'Profile', label: 'Profil', icon: 'account' },
  ],
  kepala_rayon: [
    { name: 'Home', label: 'Beranda', icon: 'home' },
    { name: 'TasksActivities', label: 'Tugas', icon: 'clipboard-check' },
    { name: 'Monitoring', label: 'Monitoring', icon: 'map' },
    { name: 'Profile', label: 'Profil', icon: 'account' },
  ],
  top_management: [
    { name: 'Monitoring', label: 'Monitoring', icon: 'map' },
    { name: 'TasksActivities', label: 'Tugas', icon: 'clipboard-check' },
    { name: 'Profile', label: 'Profil', icon: 'account' },
  ],
  admin_system: [
    { name: 'Monitoring', label: 'Monitoring', icon: 'map' },
    { name: 'TasksActivities', label: 'Tugas', icon: 'clipboard-check' },
    { name: 'Profile', label: 'Profil', icon: 'account' },
  ],
  superadmin: [
    { name: 'Monitoring', label: 'Monitoring', icon: 'map' },
    { name: 'TasksActivities', label: 'Tugas', icon: 'clipboard-check' },
    { name: 'Profile', label: 'Profil', icon: 'account' },
  ],
};

function getTabsForRole(role: UserRole): TabConfig[] {
  return TAB_CONFIGS[role] ?? TAB_CONFIGS.satgas;
}

// Map tab names to their screen components
const SCREEN_MAP: Record<string, React.ComponentType<any>> = {
  Home: HomeScreen,
  TasksActivities: TasksActivityScreen,
  Overtime: OvertimeListScreen,
  Monitoring: MapDashboardScreen,
  Profile: ProfileScreen,
};

function MainNavigator(): React.JSX.Element {
  const user = useAppSelector((state) => state.auth.user);
  const role = user?.role ?? 'satgas';
  const visibleTabs = useMemo(() => getTabsForRole(role), [role]);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: nbColors.primary,
        tabBarInactiveTintColor: nbColors.gray[600],
        headerShown: true,
        headerStyle: {
          height: 76,
          backgroundColor: nbColors.white,
          borderBottomWidth: nbBorders.thick,
          borderBottomColor: nbColors.black,
          ...nbShadows.md,
          elevation: 0,
        },
        headerTitleStyle: {
          fontSize: nbTypography.fontSize['2xl'],
          fontWeight: nbTypography.fontWeight.bold,
          color: nbColors.black,
        },
        headerTitleAlign: 'left' as const,
        headerTitleContainerStyle: {
          width: '100%',
          left: 0,
          right: 0,
        },
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        tabBarIconStyle: styles.tabBarIcon,
      }}>
      {/* Visible tabs based on role */}
      {visibleTabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={SCREEN_MAP[tab.name]}
          options={{
            headerTitle: () => <FieldHomeHeader />,
            tabBarLabel: tab.label,
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name={tab.icon} color={color} size={size} />
            ),
          }}
        />
      ))}

      {/* Hidden stack screens */}
      <Tab.Screen
        name="ClockInOut"
        component={ClockInOutScreen}
        options={{ headerTitle: () => <FieldHomeHeader />, tabBarButton: () => null }}
      />
      <Tab.Screen
        name="ActivitySubmission"
        component={ActivitySubmissionScreen}
        options={{
          title: 'Buat Aktivitas',
          tabBarButton: () => null,
          headerLeft: () => null,
        }}
      />
      <Tab.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={{ title: 'Detail Tugas', tabBarButton: () => null }}
      />
      <Tab.Screen
        name="TaskComplete"
        component={TaskCompleteScreen}
        options={{ title: 'Selesaikan Tugas', tabBarButton: () => null }}
      />
      <Tab.Screen
        name="TaskCreate"
        component={TaskCreateScreen}
        options={{ title: 'Buat Tugas', tabBarButton: () => null }}
      />
      <Tab.Screen
        name="OvertimeSubmit"
        component={OvertimeSubmitScreen}
        options={{ title: 'Ajukan Lembur', tabBarButton: () => null }}
      />
      <Tab.Screen
        name="OvertimeDetail"
        component={OvertimeDetailScreen}
        options={{ title: 'Detail Lembur', tabBarButton: () => null }}
      />
      <Tab.Screen
        name="OvertimeApproval"
        component={OvertimeApprovalScreen}
        options={{ title: 'Persetujuan Lembur', tabBarButton: () => null }}
      />
      <Tab.Screen
        name="ActivityDetail"
        component={ActivityDetailScreen}
        options={{ title: 'Detail Aktivitas', tabBarButton: () => null }}
      />
      <Tab.Screen
        name="ShiftHistory"
        component={ShiftHistoryScreen}
        options={{ title: 'Riwayat Shift', tabBarButton: () => null }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Pengaturan', tabBarButton: () => null }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 65,
    backgroundColor: nbColors.white,
    borderTopWidth: nbBorders.thick,
    borderTopColor: nbColors.black,
    ...nbShadows.md,
    paddingBottom: Platform.OS === 'ios' ? 4 : 4,
    paddingTop: 6,
  },
  tabBarLabel: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.semibold,
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

export default MainNavigator;
