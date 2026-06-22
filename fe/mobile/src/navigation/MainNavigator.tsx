/**
 * Main Navigator
 * Outer NativeStack (MainStack): Tabs screen + Profile cluster (slide-from-left).
 * Inner TabNavigator: role-based bottom tabs (no Profile tab).
 * Profile is reached by tapping the RoleAvatar in FieldHomeHeader; goBack() returns
 * to the previously active tab screen with its state intact.
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { MainTabParamList, MainStackParamList } from '../types/navigation.types';
import { nbColors, nbBorders, nbShadows, nbRadius, nbType } from '../constants/nbTokens';
import { NBText } from '../components/nb/NBText';
import { FieldHomeHeader } from '../components/navigation/FieldHomeHeader';

// Field screens (clockable roles)
import { HomeScreen } from '../screens/home/HomeScreen';
import { MenuScreen } from '../screens/menu/MenuScreen';
import { ClockInOutScreen } from '../screens/field/ClockInOutScreen';
import { ActivitySubmissionScreen } from '../screens/field/ActivitySubmissionScreen';
import { TasksScreen, ActivitiesScreen } from '../screens/taskActivity';
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

// Phase 5-1 Reporting screens
import { ReportsScreen } from '../screens/reports/ReportsScreen';
import { ReportDetailScreen } from '../screens/reports/ReportDetailScreen';

// Phase 5-2 Analytics screens
import { WorkerAnalyticsScreen, TeamAnalyticsScreen } from '../screens/analytics';

// Phase 5-3 Assets screens
import { AssetListScreen } from '../screens/assets/AssetListScreen';
import { AssetDetailScreen } from '../screens/assets/AssetDetailScreen';
import { QRScannerScreen } from '../screens/assets/QRScannerScreen';
import { AssetCheckoutScreen } from '../screens/assets/AssetCheckoutScreen';
import { AssetReturnScreen } from '../screens/assets/AssetReturnScreen';

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
// Profile is a bottom tab (rendered directly in TabNavigator), so it is NOT wrapped
// here — the header avatar and the tab both resolve to that single ProfileScreen.
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

/**
 * Uniform bottom bar — every role sees exactly Home · Menu · Profile.
 * All other features are reached from the Menu launcher (see MENU_CONFIGS).
 */
export const UNIFORM_TAB_CONFIG: TabConfig[] = [
  { name: 'Home', label: 'Beranda', icon: 'home' },
  { name: 'Menu', label: 'Menu', icon: 'view-grid-outline' },
  { name: 'Profile', label: 'Profil', icon: 'account-outline' },
];

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

/**
 * Custom bottom tab bar — a plain flexbox row we fully control.
 *
 * The default @react-navigation/bottom-tabs v7 tab bar collapses all items into
 * the start of the bar on the New Architecture (Android), no matter what
 * `tabBarItemStyle`/`tabBarLabelPosition` we pass. Rendering our own row of
 * equal-width (`flex: 1`) items sidesteps the library's internal measurement and
 * guarantees even distribution + reliable touch targets.
 */
function MainTabBar({ state, navigation }: BottomTabBarProps): React.JSX.Element {
  const visibleTabs = UNIFORM_TAB_CONFIG;
  const insets = useSafeAreaInsets();

  const focusedName = state.routes[state.index]?.name;

  return (
    <View style={[styles.tabBar, { paddingBottom: 6 + insets.bottom }]}>
      {visibleTabs.map((tab) => {
        const route = state.routes.find((r) => r.name === tab.name);
        if (!route) {
          return null;
        }
        const focused = focusedName === tab.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name as never);
          }
        };

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabBarItem}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={tab.label}
          >
            <TabBarIcon focused={focused} name={tab.icon} />
            <NBText
              variant="mono-sm"
              color={focused ? 'black' : 'gray600'}
              numberOfLines={1}
              style={styles.tabLabel}
            >
              {tab.label}
            </NBText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * Options for a feature screen reached from the Menu launcher: a titled NB header
 * whose back arrow returns to wherever the user came from (Menu, or Home for the
 * few home shortcuts), thanks to the navigator's `backBehavior="history"`.
 */
function featureScreen(title: string) {
  return ({ navigation }: { navigation: { goBack: () => void } }) => ({
    headerTitle: () => <FieldHomeHeader title={title} onBack={() => navigation.goBack()} />,
    tabBarButton: () => null,
  });
}

function TabNavigator(): React.JSX.Element {
  return (
    <Tab.Navigator
      tabBar={(props) => <MainTabBar {...props} />}
      backBehavior="history"
      screenOptions={{
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
      }}>
      {/* Visible tabs — uniform across all roles (Home · Menu · Profile) */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerTitle: () => <FieldHomeHeader /> }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{ headerTitle: () => <FieldHomeHeader title="Menu" /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerTitle: () => <FieldHomeHeader title="Profil" /> }}
      />

      {/* Feature screens — reached from the Menu launcher (hidden from the bar) */}
      <Tab.Screen name="Absensi" component={ClockInOutScreen} options={featureScreen('Kehadiran')} />
      <Tab.Screen name="Lembur" component={OvertimeListScreen} options={featureScreen('Lembur')} />
      <Tab.Screen name="Tasks" component={TasksScreen} options={featureScreen('Tugas')} />
      <Tab.Screen name="Activities" component={ActivitiesScreen} options={featureScreen('Aktivitas')} />
      <Tab.Screen name="Monitoring" component={MapDashboardScreen} options={featureScreen('Monitoring')} />
      <Tab.Screen name="Reports" component={ReportsScreen} options={featureScreen('Laporan')} />
      <Tab.Screen name="Assets" component={AssetListScreen} options={featureScreen('Aset')} />
      <Tab.Screen name="WorkerAnalytics" component={WorkerAnalyticsScreen} options={featureScreen('Kinerja')} />
      <Tab.Screen name="TeamAnalytics" component={TeamAnalyticsScreen} options={featureScreen('Analitik')} />
      <Tab.Screen name="PlantSeeds" component={PlantSeedsInventoryScreen} options={featureScreen('Bibit')} />
      <Tab.Screen name="PruningReviewQueue" component={ReviewQueueScreen} options={featureScreen('Perantingan')} />
      <Tab.Screen name="Perantingan" component={PerantinganListScreen} options={featureScreen('Perantingan')} />

      {/* Hidden stack screens */}

      <Tab.Screen
        name="ActivitySubmission"
        component={ActivitySubmissionScreen}
        options={({ navigation }) => ({
          headerTitle: () => (
            <FieldHomeHeader
              title="Buat Aktivitas"
              onBack={() => navigation.navigate('Activities')}
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
              navigation.navigate('Tasks');
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
              navigation.navigate('Activities');
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
          headerTitle: () => <FieldHomeHeader title="Detail Lembur" onBack={() => navigation.navigate('Lembur')} />,
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

      {/* Phase 5-1 Reporting hidden screen */}
      <Tab.Screen
        name="ReportDetail"
        component={ReportDetailScreen}
        options={({ navigation }) => ({
          headerTitle: () => (
            <FieldHomeHeader
              title="Detail Laporan"
              onBack={() => navigation.navigate('Reports' as any)}
            />
          ),
          tabBarButton: () => null,
        })}
      />

      {/* Phase 5-3 Assets hidden screens */}
      <Tab.Screen
        name="AssetDetail"
        component={AssetDetailScreen}
        options={({ navigation }) => ({
          headerTitle: () => (
            <FieldHomeHeader
              title="Detail Aset"
              onBack={() => navigation.navigate('Assets' as any)}
            />
          ),
          tabBarButton: () => null,
        })}
      />
      <Tab.Screen
        name="QRScanner"
        component={QRScannerScreen}
        options={({ navigation }) => ({
          headerTitle: () => (
            <FieldHomeHeader title="Pindai QR" onBack={() => navigation.goBack()} />
          ),
          tabBarButton: () => null,
        })}
      />
      <Tab.Screen
        name="AssetCheckout"
        component={AssetCheckoutScreen}
        options={({ navigation }) => ({
          headerTitle: () => (
            <FieldHomeHeader title="Pinjam Aset" onBack={() => navigation.goBack()} />
          ),
          tabBarButton: () => null,
        })}
      />
      <Tab.Screen
        name="AssetReturn"
        component={AssetReturnScreen}
        options={({ navigation }) => ({
          headerTitle: () => (
            <FieldHomeHeader title="Kembalikan Aset" onBack={() => navigation.goBack()} />
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
          NativeStack header is disabled; withProfileHeader provides the 76px header.
          (Profile itself is a bottom tab, not a stack screen — see TabNavigator.) */}
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
    flexDirection: 'row',
    minHeight: 68,
    backgroundColor: nbColors.white,
    borderTopWidth: nbBorders.widthThick,
    borderTopColor: nbColors.black,
    ...nbShadows.md,
    paddingTop: 6,
    // paddingBottom is applied dynamically (6 + safe-area inset) in MainTabBar.
  },
  tabBarItem: {
    // Equal-width distribution across the row + reliable touch target.
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
