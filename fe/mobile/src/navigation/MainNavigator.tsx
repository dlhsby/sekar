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
import { TasksActivityScreen } from '../screens/taskActivity';
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

// Task creation screen
import { TaskCreateScreen } from '../screens/taskActivity';

// Common screens
import { SettingsScreen } from '../screens/common/SettingsScreen';
import { EditProfileScreen } from '../screens/common/EditProfileScreen';

// Pruning Requests screens (Phase 3 sub-phase 3-10)
import { ReviewQueueScreen } from '../screens/pruningRequests/ReviewQueueScreen';
import { RequestDetailScreen } from '../screens/pruningRequests/RequestDetailScreen';
// Phase 3 Apr 27 — staff_kecamatan tab
import { PerantinganListScreen } from '../screens/pruningRequests/PerantinganListScreen';
import { SubmitScreen } from '../screens/pruningRequests/SubmitScreen';

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
    { name: 'TasksActivities', label: 'Tugas & Aktivitas', icon: 'clipboard-list-outline' },
    { name: 'Overtime', label: 'Lembur', icon: 'clock-plus-outline' },
    { name: 'Profile', label: 'Profil', icon: 'account' },
  ],
  admin_data: [
    { name: 'Home', label: 'Beranda', icon: 'home' },
    { name: 'TasksActivities', label: 'Tugas & Aktivitas', icon: 'clipboard-list-outline' },
    // Phase 3 May 9, 2026 — admin_data review queue surface so the role can
    // approve / reject / convert pruning_requests on mobile (previously the
    // screen was registered but had no menu entry, leaving it web-only).
    { name: 'PruningReviewQueue', label: 'Perantingan', icon: 'tree-outline' },
    { name: 'Monitoring', label: 'Monitoring', icon: 'chart-bar' },
    { name: 'Overtime', label: 'Lembur', icon: 'clock-outline' },
    { name: 'Profile', label: 'Profil', icon: 'account' },
  ],
  kepala_rayon: [
    { name: 'Home', label: 'Beranda', icon: 'home' },
    { name: 'Monitoring', label: 'Monitoring', icon: 'map' },
    { name: 'TasksActivities', label: 'Tugas & Aktivitas', icon: 'clipboard-list-outline' },
    { name: 'Overtime', label: 'Lembur', icon: 'clock-check-outline' },
    { name: 'Profile', label: 'Profil', icon: 'account' },
  ],
  top_management: [
    { name: 'Monitoring', label: 'Monitoring', icon: 'map' },
    { name: 'TasksActivities', label: 'Tugas & Aktivitas', icon: 'clipboard-list-outline' },
    { name: 'Profile', label: 'Profil', icon: 'account' },
  ],
  admin_system: [
    { name: 'Monitoring', label: 'Monitoring', icon: 'map' },
    { name: 'TasksActivities', label: 'Tugas & Aktivitas', icon: 'clipboard-list-outline' },
    { name: 'Profile', label: 'Profil', icon: 'account' },
  ],
  superadmin: [
    { name: 'Monitoring', label: 'Monitoring', icon: 'map' },
    { name: 'TasksActivities', label: 'Tugas & Aktivitas', icon: 'clipboard-list-outline' },
    { name: 'Overtime', label: 'Lembur', icon: 'clock-check-outline' },
    { name: 'Profile', label: 'Profil', icon: 'account' },
  ],
  // Phase 3 Apr 27 — staff_kecamatan: 2-tab layout (request submission + profile)
  staff_kecamatan: [
    { name: 'Perantingan', label: 'Perantingan', icon: 'tree-outline' },
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
  // Phase 3 Apr 27 — staff_kecamatan tab
  Perantingan: PerantinganListScreen,
  // Phase 3 May 9 — admin_data review queue tab
  PruningReviewQueue: ReviewQueueScreen,
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
        // No left/right overrides: React Navigation positions title after headerLeft naturally,
        // which keeps sub-screen titles left-aligned at the same visual position as the greeting.
        // headerTitle fills the FULL header width — FieldHomeHeader owns all 3 columns.
        // React Navigation uses absolute positioning for the title container, so
        // left/right (not flex:1) is what actually stretches it edge-to-edge.
        // Title slot: override the computed maxWidth cap and remove default 16px margins.
        // The computed maxWidth (layout.width - 32) is injected before titleContainerStyle
        // in the style array, so placing maxWidth: 9999 here overrides it (last wins).
        headerTitleContainerStyle: {
          flex: 1,
          marginHorizontal: 0,
          maxWidth: 9999,
        },
        // Right slot always gets flexGrow:1 from styles.expand — collapse it explicitly.
        // Using flexGrow/flexBasis individually is more reliable than the flex shorthand
        // when overriding a preceding flexGrow:1 in the merged style array.
        headerRightContainerStyle: {
          flexGrow: 0,
          flexBasis: 0,
          width: 0,
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

      {/* Hidden stack screens — all use FieldHomeHeader for consistent 3-column layout.
          Back navigation is via `onBack` prop on FieldHomeHeader (never headerLeft).
          Screens with dynamic title/back keep their own setOptions (ClockInOut, TaskComplete). */}

      {/* ClockInOut: screen's setOptions provides dynamic title + onBack */}
      <Tab.Screen
        name="ClockInOut"
        component={ClockInOutScreen}
        options={{ headerTitle: () => <FieldHomeHeader />, tabBarButton: () => null }}
      />

      {/* ActivitySubmission: back to Aktivitas tab */}
      <Tab.Screen
        name="ActivitySubmission"
        component={ActivitySubmissionScreen}
        options={({ navigation }) => ({
          headerTitle: () => (
            <FieldHomeHeader
              title="Buat Aktivitas"
              onBack={() => navigation.navigate('TasksActivities', { initialTab: 'activities' })}
            />
          ),
          tabBarButton: () => null,
        })}
      />

      {/* TaskDetail: back honors `from`/`fromParams` route params so callers
          (e.g. PruningDetail → "Lihat Tugas") can route the back action back
          to themselves instead of always landing on the Tugas list. */}
      <Tab.Screen
        name="TaskDetail"
        component={TaskDetailScreen}
        options={({ navigation, route }) => {
          const params = (route.params ?? {}) as {
            from?: string;
            fromParams?: Record<string, unknown>;
          };
          const onBack = () => {
            if (params.from) {
              navigation.navigate(params.from as any, params.fromParams as any);
            } else {
              navigation.navigate('TasksActivities', { initialTab: 'tasks' });
            }
          };
          return {
            headerTitle: () => (
              <FieldHomeHeader title="Detail Tugas" onBack={onBack} />
            ),
            tabBarButton: () => null,
          };
        }}
      />

      {/* TaskComplete: screen's setOptions overrides with handleCancel as onBack */}
      <Tab.Screen
        name="TaskComplete"
        component={TaskCompleteScreen}
        options={{
          headerTitle: () => <FieldHomeHeader title="Selesaikan Tugas" />,
          tabBarButton: () => null,
        }}
      />

      {/* ActivityDetail: navigates back to TasksActivities (not generic goBack) */}
      <Tab.Screen
        name="ActivityDetail"
        component={ActivityDetailScreen}
        options={({ navigation }) => ({
          headerTitle: () => (
            <FieldHomeHeader
              title="Detail Aktivitas"
              onBack={() => navigation.navigate('TasksActivities')}
            />
          ),
          tabBarButton: () => null,
        })}
      />

      {/* ShiftHistory: navigates back to Profile (not generic goBack) */}
      <Tab.Screen
        name="ShiftHistory"
        component={ShiftHistoryScreen}
        options={({ navigation }) => ({
          headerTitle: () => (
            <FieldHomeHeader
              title="Riwayat Shift"
              onBack={() => navigation.navigate('Profile')}
            />
          ),
          tabBarButton: () => null,
        })}
      />

      {/* Remaining sub screens: standard goBack via onBack prop */}
      <Tab.Screen
        name="TaskCreate"
        component={TaskCreateScreen}
        options={({ navigation }) => ({
          headerTitle: () => <FieldHomeHeader title="Buat Tugas" onBack={() => navigation.goBack()} />,
          tabBarButton: () => null,
        })}
      />
      <Tab.Screen
        name="OvertimeSubmit"
        component={OvertimeSubmitScreen}
        options={({ navigation }) => ({
          headerTitle: () => <FieldHomeHeader title="Ajukan Lembur" onBack={() => navigation.goBack()} />,
          tabBarButton: () => null,
        })}
      />
      <Tab.Screen
        name="OvertimeDetail"
        component={OvertimeDetailScreen}
        options={({ navigation }) => ({
          headerTitle: () => <FieldHomeHeader title="Detail Lembur" onBack={() => navigation.navigate('Overtime' as any)} />,
          tabBarButton: () => null,
        })}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={({ navigation }) => ({
          headerTitle: () => <FieldHomeHeader title="Pengaturan" onBack={() => navigation.goBack()} />,
          tabBarButton: () => null,
        })}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={({ navigation }) => ({
          headerTitle: () => <FieldHomeHeader title="Kehadiran" onBack={() => navigation.goBack()} />,
          tabBarButton: () => null,
        })}
      />
      <Tab.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={({ navigation }) => ({
          headerTitle: () => (
            <FieldHomeHeader title="Edit Profil" onBack={() => navigation.goBack()} />
          ),
          tabBarButton: () => null,
        })}
      />

      {/* PruningReviewQueue is registered via TAB_CONFIGS.admin_data + SCREEN_MAP
          (Phase 3 May 9). The visible-tab loop renders it with the standard
          FieldHomeHeader greeting; we override the title here is NOT needed
          since it lives in its own tab now. */}

      {/* Pruning Request Detail: accessed from both submission and review flows.
          May 11, 2026 — back action explicitly routes by `adminMode` (passed as a
          route param) so admin_data lands on the Review Queue and kecamatan
          lands on their Perantingan list. Tab.goBack() previously returned to
          the most-recently-focused other tab (usually Home), which was wrong. */}
      <Tab.Screen
        name="PruningDetail"
        component={RequestDetailScreen}
        options={({ navigation, route }) => {
          const params = (route.params ?? {}) as { adminMode?: boolean };
          const target = params.adminMode ? 'PruningReviewQueue' : 'Perantingan';
          return {
            headerTitle: () => (
              <FieldHomeHeader
                title="Detail Permohonan"
                onBack={() => navigation.navigate(target)}
              />
            ),
            tabBarButton: () => null,
          };
        }}
      />

      {/* Phase 3 Apr 27 — staff_kecamatan submission form (scrollable cards) */}
      <Tab.Screen
        name="PerantinganSubmit"
        component={SubmitScreen}
        options={({ navigation }) => ({
          headerTitle: () => (
            <FieldHomeHeader
              title="Buat Permohonan"
              onBack={() => navigation.goBack()}
            />
          ),
          tabBarButton: () => null,
        })}
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
