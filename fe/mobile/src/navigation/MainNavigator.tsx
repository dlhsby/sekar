/**
 * Main Navigator
 * Outer NativeStack (MainStack): Tabs screen + Profile cluster (slide-from-left).
 * Inner TabNavigator: role-based bottom tabs (no Profile tab).
 * Profile is reached by tapping the RoleAvatar in FieldHomeHeader; goBack() returns
 * to the previously active tab screen with its state intact.
 */

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MainTabParamList, MainStackParamList } from '../types/navigation.types';
import type { UserRole } from '../types/models.types';
import { nbColors, nbBorders, nbShadows, nbRadius, nbType } from '../constants/nbTokens';
import { NBText } from '../components/nb/NBText';
import { useAppSelector } from '../store/hooks';
import { FieldHomeHeader } from '../components/navigation/FieldHomeHeader';

// Field screens (clockable roles)
import { HomeScreen } from '../screens/home/HomeScreen';
import { ClockInOutScreen } from '../screens/field/ClockInOutScreen';
import { ActivitySubmissionScreen } from '../screens/field/ActivitySubmissionScreen';
import { TasksActivityScreen } from '../screens/taskActivity';
import { TaskDetailScreen } from '../screens/field/TaskDetailScreen';
import { TaskCompleteScreen } from '../screens/field/TaskCompleteScreen';
import { ShiftHistoryScreen } from '../screens/field/ShiftHistoryScreen';
import { ActivityDetailScreen } from '../screens/field/ActivityDetailScreen';
// Monitoring screens
import { MapDashboardScreen } from '../screens/monitoring/MapDashboardScreen';

// Profile cluster (all live in MainStack, not the bottom tabs)
import { ProfileScreen } from '../screens/common/ProfileScreen';
import { SettingsScreen } from '../screens/common/SettingsScreen';
import { NotificationPreferencesScreen } from '../screens/common/NotificationPreferencesScreen';
import { EditProfileScreen } from '../screens/common/EditProfileScreen';
import { DiagnosticsScreen } from '../screens/common/DiagnosticsScreen';

// Overtime screens
import { OvertimeListScreen } from '../screens/overtime/OvertimeListScreen';
import { OvertimeSubmitScreen } from '../screens/overtime/OvertimeSubmitScreen';
import { OvertimeDetailScreen } from '../screens/overtime/OvertimeDetailScreen';

// Task creation screen
import { TaskCreateScreen } from '../screens/taskActivity';

// Common screens
import { NotificationsScreen } from '../screens/common/NotificationsScreen';

// Pruning Requests screens
import { ReviewQueueScreen } from '../screens/pruningRequests/ReviewQueueScreen';
import { RequestDetailScreen } from '../screens/pruningRequests/RequestDetailScreen';
import { PerantinganListScreen } from '../screens/pruningRequests/PerantinganListScreen';
import { SubmitScreen } from '../screens/pruningRequests/SubmitScreen';

// Plant Seeds screens (Phase 3 3-12)
import { PlantSeedsInventoryScreen } from '../screens/seeds/PlantSeedsInventoryScreen';
import { SeedDetailScreen } from '../screens/seeds/SeedDetailScreen';
import { SeedTransactionFormScreen } from '../screens/seeds/SeedTransactionFormScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

/**
 * Wraps a screen with the same NB header chrome (height 76, border-bottom,
 * hard-edge shadow) used by the bottom-tab navigator. Defined at module level
 * so React never sees a new component type on re-render, which would cause
 * the wrapped screen to unmount/remount.
 */
function withProfileHeader(
  Component: React.ComponentType<any>,
  title: string,
  // Optional back override. Defaults to a plain stack pop. Screens that can be
  // reached via a deep-link round-trip (e.g. Notifications → detail → back →
  // Notifications) supply a deterministic target so backing out can't bounce
  // back onto the screen the deep-link left focused underneath.
  onBack?: (navigation: any, route: any) => void,
): React.ComponentType<any> {
  const Wrapped = ({ navigation, route }: any) => (
    <View style={{ flex: 1 }}>
      <View style={headerChrome}>
        <FieldHomeHeader
          title={title}
          onBack={() => (onBack ? onBack(navigation, route) : navigation.goBack())}
        />
      </View>
      <Component navigation={navigation} route={route} />
    </View>
  );
  Wrapped.displayName = `ProfileHeader(${title})`;
  return Wrapped;
}

// Shared NB header chrome — used by both the bottom-tab navigator's headerStyle
// and the withProfileHeader wrapper so both surfaces are identical pixel-for-pixel.
export const NB_HEADER_STYLE = {
  height: 76,
  backgroundColor: nbColors.white,
  borderBottomWidth: nbBorders.widthThick,
  borderBottomColor: nbColors.black,
  ...nbShadows.md,
  elevation: 0,
} as const;

// Same chrome with `justifyContent: 'center'` so FieldHomeHeader is vertically
// centred inside the 76 px wrapper (matching how the tab navigator centres it).
const headerChrome = { ...NB_HEADER_STYLE, justifyContent: 'center' as const };

// Singleton wrapped components — created once at module load so the component
// reference is stable across renders (prevents remount on navigation state updates).
const ProfileWithHeader    = withProfileHeader(ProfileScreen,    'Profil');
const ShiftHistoryWithHeader = withProfileHeader(ShiftHistoryScreen, 'Riwayat Shift');
const SettingsWithHeader   = withProfileHeader(SettingsScreen,   'Pengaturan');
const NotificationPreferencesWithHeader = withProfileHeader(
  NotificationPreferencesScreen,
  'Preferensi Notifikasi',
);
const EditProfileWithHeader = withProfileHeader(EditProfileScreen, 'Edit Profil');
const DiagnosticsWithHeader = withProfileHeader(DiagnosticsScreen, 'Diagnostik');
// Back returns to the tab the bell was tapped from (`origin`), or Home as a
// fallback. Routing to a fixed tab (rather than a stack pop) also keeps the
// deep-link round-trip — inbox → detail → back → inbox → back — from looping.
const NotificationsWithHeader = withProfileHeader(
  NotificationsScreen,
  'Notifikasi',
  (navigation, route) => {
    const origin = (route?.params as { origin?: string } | undefined)?.origin;
    navigation.navigate('Tabs', { screen: origin ?? 'Home' });
  },
);

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
  ],
  linmas: [
    { name: 'Home', label: 'Beranda', icon: 'home' },
    { name: 'TasksActivities', label: 'Tugas & Aktivitas', icon: 'clipboard-list-outline' },
    { name: 'Overtime', label: 'Lembur', icon: 'clock-plus-outline' },
  ],
  korlap: [
    { name: 'Home', label: 'Beranda', icon: 'home' },
    { name: 'Monitoring', label: 'Monitoring', icon: 'map' },
    { name: 'TasksActivities', label: 'Tugas & Aktivitas', icon: 'clipboard-list-outline' },
    { name: 'Overtime', label: 'Lembur', icon: 'clock-plus-outline' },
  ],
  admin_data: [
    { name: 'Home', label: 'Beranda', icon: 'home' },
    { name: 'TasksActivities', label: 'Tugas & Aktivitas', icon: 'clipboard-list-outline' },
    { name: 'PlantSeeds', label: 'Bibit', icon: 'leaf-outline' },
    { name: 'PruningReviewQueue', label: 'Perantingan', icon: 'tree-outline' },
    { name: 'Monitoring', label: 'Monitoring', icon: 'chart-bar' },
    { name: 'Overtime', label: 'Lembur', icon: 'clock-outline' },
  ],
  kepala_rayon: [
    { name: 'Home', label: 'Beranda', icon: 'home' },
    { name: 'Monitoring', label: 'Monitoring', icon: 'map' },
    { name: 'TasksActivities', label: 'Tugas & Aktivitas', icon: 'clipboard-list-outline' },
    { name: 'Overtime', label: 'Lembur', icon: 'clock-check-outline' },
  ],
  top_management: [
    { name: 'Home', label: 'Beranda', icon: 'home' },
    { name: 'Monitoring', label: 'Monitoring', icon: 'map' },
    { name: 'PlantSeeds', label: 'Bibit', icon: 'leaf-outline' },
    { name: 'TasksActivities', label: 'Tugas & Aktivitas', icon: 'clipboard-list-outline' },
  ],
  admin_system: [
    { name: 'Home', label: 'Beranda', icon: 'home' },
    { name: 'Monitoring', label: 'Monitoring', icon: 'map' },
    { name: 'PlantSeeds', label: 'Bibit', icon: 'leaf-outline' },
    { name: 'TasksActivities', label: 'Tugas & Aktivitas', icon: 'clipboard-list-outline' },
  ],
  superadmin: [
    { name: 'Home', label: 'Beranda', icon: 'home' },
    { name: 'Monitoring', label: 'Monitoring', icon: 'map' },
    { name: 'TasksActivities', label: 'Tugas & Aktivitas', icon: 'clipboard-list-outline' },
    { name: 'Overtime', label: 'Lembur', icon: 'clock-check-outline' },
  ],
  staff_kecamatan: [
    { name: 'Home', label: 'Beranda', icon: 'home' },
    { name: 'Perantingan', label: 'Perantingan', icon: 'tree-outline' },
  ],
};

function getTabsForRole(role: UserRole): TabConfig[] {
  return TAB_CONFIGS[role] ?? TAB_CONFIGS.satgas;
}

const SCREEN_MAP: Record<string, React.ComponentType<any>> = {
  Home: HomeScreen,
  TasksActivities: TasksActivityScreen,
  Overtime: OvertimeListScreen,
  Monitoring: MapDashboardScreen,
  Perantingan: PerantinganListScreen,
  PruningReviewQueue: ReviewQueueScreen,
  PlantSeeds: PlantSeedsInventoryScreen,
};

function TabBarIcon({ focused, name }: { focused: boolean; name: string }): React.JSX.Element {
  return (
    <View style={focused ? styles.tabIconActive : styles.tabIconInactive}>
      <MaterialCommunityIcons
        name={name}
        size={20}
        color={focused ? nbColors.black : nbColors.gray600}
      />
    </View>
  );
}

function TabNavigator(): React.JSX.Element {
  const user = useAppSelector((state) => state.auth.user);
  const role = user?.role ?? 'satgas';
  const visibleTabs = useMemo(() => getTabsForRole(role), [role]);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: nbColors.primary,
        tabBarInactiveTintColor: nbColors.gray600,
        headerShown: true,
        headerStyle: NB_HEADER_STYLE,
        headerTitleStyle: {
          fontSize: nbType.h2.fontSize,
          fontWeight: nbType.h1.fontWeight,
          color: nbColors.black,
        },
        headerTitleAlign: 'left' as const,
        headerTitleContainerStyle: {
          flex: 1,
          marginHorizontal: 0,
          maxWidth: 9999,
        },
        headerRightContainerStyle: {
          flexGrow: 0,
          flexBasis: 0,
          width: 0,
        },
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
      }}>
      {visibleTabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={SCREEN_MAP[tab.name]}
          options={{
            headerTitle: () => <FieldHomeHeader />,
            tabBarLabel: ({ focused }) => (
              <NBText
                variant="mono-sm"
                color={focused ? 'black' : 'gray600'}
                numberOfLines={1}
                style={styles.tabLabel}
              >
                {tab.label}
              </NBText>
            ),
            tabBarIcon: ({ focused }) => (
              <TabBarIcon focused={focused} name={tab.icon} />
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

      <Tab.Screen
        name="TaskComplete"
        component={TaskCompleteScreen}
        options={{
          headerTitle: () => <FieldHomeHeader title="Selesaikan Tugas" />,
          tabBarButton: () => null,
        }}
      />

      <Tab.Screen
        name="ActivityDetail"
        component={ActivityDetailScreen}
        options={({ navigation, route }) => {
          const params = (route.params ?? {}) as {
            from?: string;
            fromParams?: Record<string, unknown>;
          };
          const onBack = () => {
            if (params.from) {
              navigation.navigate(params.from as any, params.fromParams as any);
            } else {
              navigation.navigate('TasksActivities', { initialTab: 'activities' });
            }
          };
          return {
            headerTitle: () => (
              <FieldHomeHeader title="Detail Aktivitas" onBack={onBack} />
            ),
            tabBarButton: () => null,
          };
        }}
      />

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
        name="PruningDetail"
        component={RequestDetailScreen}
        options={({ navigation, route }) => {
          const params = (route.params ?? {}) as {
            adminMode?: boolean;
            from?: string;
            fromParams?: Record<string, unknown>;
          };
          // Honor a caller-supplied back target (e.g. Notifications inbox);
          // otherwise fall back to the pruning queue / list per adminMode.
          const onBack = () => {
            if (params.from) {
              navigation.navigate(params.from as any, params.fromParams as any);
            } else {
              navigation.navigate(params.adminMode ? 'PruningReviewQueue' : 'Perantingan');
            }
          };
          return {
            headerTitle: () => (
              <FieldHomeHeader title="Detail Permohonan" onBack={onBack} />
            ),
            tabBarButton: () => null,
          };
        }}
      />
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

      {/* Plant Seeds hidden screens */}
      <Tab.Screen
        name="SeedDetail"
        component={SeedDetailScreen}
        options={({ navigation }) => ({
          headerTitle: () => (
            <FieldHomeHeader
              title="Detail Bibit"
              onBack={() => navigation.navigate('PlantSeeds' as any)}
            />
          ),
          tabBarButton: () => null,
        })}
      />
      <Tab.Screen
        name="SeedTransactionForm"
        component={SeedTransactionFormScreen}
        options={({ navigation }) => ({
          headerTitle: () => (
            <FieldHomeHeader
              title="Catat Transaksi"
              onBack={() => navigation.goBack()}
            />
          ),
          tabBarButton: () => null,
        })}
      />
    </Tab.Navigator>
  );
}

function MainNavigator(): React.JSX.Element {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="Tabs" component={TabNavigator} />

      {/* Profile cluster — JS header wrapper ensures identical chrome to tab headers.
          NativeStack header is disabled; withProfileHeader provides the 76px header. */}
      <MainStack.Screen
        name="Profile"
        component={ProfileWithHeader}
        options={{ animation: 'slide_from_left' }}
      />
      <MainStack.Screen
        name="ShiftHistory"
        component={ShiftHistoryWithHeader}
        options={{ animation: 'slide_from_left' }}
      />
      <MainStack.Screen
        name="Settings"
        component={SettingsWithHeader}
        options={{ animation: 'slide_from_left' }}
      />
      <MainStack.Screen
        name="NotificationPreferences"
        component={NotificationPreferencesWithHeader}
        options={{ animation: 'slide_from_left' }}
      />
      <MainStack.Screen
        name="EditProfile"
        component={EditProfileWithHeader}
        options={{ animation: 'slide_from_left' }}
      />
      {/* Notifications inbox — slide-in from the header bell, matching the
          Profile cluster. Deep-links into tab detail screens via navigate('Tabs', …). */}
      <MainStack.Screen
        name="Notifications"
        component={NotificationsWithHeader}
        // gestureEnabled:false — the inbox owns its back (header + hardware) so it
        // can return to the origin tab; a raw swipe-pop could reveal a deep-linked
        // detail left underneath and loop. slide-in animation is unaffected.
        options={{ animation: 'slide_from_left', gestureEnabled: false }}
      />
      <MainStack.Screen
        name="Diagnostics"
        component={DiagnosticsWithHeader}
        options={{ animation: 'slide_from_left' }}
      />
    </MainStack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 68,
    backgroundColor: nbColors.white,
    borderTopWidth: nbBorders.widthThick,
    borderTopColor: nbColors.black,
    ...nbShadows.md,
    paddingBottom: 6,
    paddingTop: 6,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
  tabIconActive: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: nbColors.primary,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.sm,
    ...nbShadows.xs,
  },
  tabIconInactive: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 9.5,
    lineHeight: 12,
    letterSpacing: 0.2,
    marginTop: 2,
  },
});

export default MainNavigator;
