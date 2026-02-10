# Mobile Navigation Specification

Complete navigation structure and routing for SEKAR React Native mobile application.

## Overview

### Navigation Library
- **Primary:** React Navigation 7.x
- **Stack:** @react-navigation/native-stack (native navigation)
- **Tabs:** @react-navigation/bottom-tabs (bottom tab bar)

> **Design System:** Tab bar and header styling use Neo Brutalism 2.0 tokens from `specs/ui-ux/neo-brutalism.md`

### Navigation Structure

```
Root
├─ Auth Stack (Unauthenticated)
│  └─ Login
│
├─ Worker Stack (Role: Worker)
│  └─ WorkerTabs
│     ├─ Home (Tab)
│     ├─ Reports (Tab)
│     ├─ Profile (Tab)
│     ├─ ClockInOut (Modal)
│     ├─ ReportSubmission (Modal)
│     ├─ ReportDetail (Push)
│     └─ LocationTracking (Push)
│
└─ Supervisor Stack (Role: Supervisor)
   └─ SupervisorTabs
      ├─ Map (Tab)
      ├─ Reports (Tab)
      ├─ Attendance (Tab)
      ├─ Profile (Tab)
      ├─ ReportDetail (Push)
      └─ WorkerDetail (Push)
```

---

## Type Definitions

### Navigation Types

```typescript
// types/navigation.types.ts

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

// Root Stack (handles authentication routing)
export type RootStackParamList = {
  Login: undefined;
  WorkerTabs: undefined;
  SupervisorTabs: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

// Worker Tab Navigator
export type WorkerTabParamList = {
  WorkerHome: undefined;
  WorkerReports: undefined;
  WorkerProfile: undefined;
};

export type WorkerTabScreenProps<T extends keyof WorkerTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<WorkerTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

// Worker Stack Navigator (modals and push screens)
export type WorkerStackParamList = {
  WorkerTabs: undefined;
  ClockInOut: { mode: 'clock-in' | 'clock-out' };
  ReportSubmission: { shiftId: string };
  ReportDetail: { reportId: string };
  LocationTracking: { shiftId: string };
};

export type WorkerStackScreenProps<T extends keyof WorkerStackParamList> =
  NativeStackScreenProps<WorkerStackParamList, T>;

// Supervisor Tab Navigator
export type SupervisorTabParamList = {
  SupervisorMap: undefined;
  SupervisorReports: undefined;
  SupervisorAttendance: undefined;
  SupervisorProfile: undefined;
};

export type SupervisorTabScreenProps<T extends keyof SupervisorTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<SupervisorTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

// Supervisor Stack Navigator
export type SupervisorStackParamList = {
  SupervisorTabs: undefined;
  ReportDetail: { reportId: string };
  WorkerDetail: { workerId: string; shiftId?: string };
};

export type SupervisorStackScreenProps<T extends keyof SupervisorStackParamList> =
  NativeStackScreenProps<SupervisorStackParamList, T>;

// Type-safe navigation hook
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
```

---

## Root Navigator

### Implementation

```typescript
// navigation/RootNavigator.tsx

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation.types';
import { useAppSelector } from '../store/hooks';

// Screens
import LoginScreen from '../screens/auth/LoginScreen';
import WorkerNavigator from './WorkerNavigator';
import SupervisorNavigator from './SupervisorNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigator(): React.JSX.Element {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}>
        {!isAuthenticated || !user ? (
          // Unauthenticated Stack
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : user.role === 'worker' ? (
          // Worker Stack
          <Stack.Screen name="WorkerTabs" component={WorkerNavigator} />
        ) : (
          // Supervisor Stack
          <Stack.Screen name="SupervisorTabs" component={SupervisorNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default RootNavigator;
```

### Authentication Flow

```typescript
// Navigation automatically updates when auth state changes

// Login success
dispatch(loginSuccess({ token, user }));
// → Navigation re-renders and shows WorkerTabs or SupervisorTabs

// Logout
dispatch(logout());
// → Navigation re-renders and shows Login screen
```

### Deep Linking Configuration (Phase 2+)

```typescript
// navigation/linking.ts

import { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation.types';

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['sekar://', 'https://sekar.DLH-sby.go.id'],
  config: {
    screens: {
      Login: 'login',
      WorkerTabs: {
        screens: {
          WorkerHome: 'worker/home',
          WorkerReports: 'worker/reports',
          WorkerProfile: 'worker/profile',
        },
      },
      SupervisorTabs: {
        screens: {
          SupervisorMap: 'supervisor/map',
          SupervisorReports: 'supervisor/reports',
          SupervisorAttendance: 'supervisor/attendance',
          SupervisorProfile: 'supervisor/profile',
        },
      },
    },
  },
};

// Usage in NavigationContainer
<NavigationContainer linking={linking}>
  {/* ... */}
</NavigationContainer>
```

---

## Worker Navigator

### Tab Navigator Implementation

```typescript
// navigation/WorkerNavigator.tsx

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { WorkerTabParamList, WorkerStackParamList } from '../types/navigation.types';

// Tab Screens
import WorkerHomeScreen from '../screens/worker/WorkerHomeScreen';
import WorkerReportsScreen from '../screens/worker/WorkerReportsScreen';
import WorkerProfileScreen from '../screens/worker/WorkerProfileScreen';

// Modal/Push Screens
import ClockInOutScreen from '../screens/worker/ClockInOutScreen';
import ReportSubmissionScreen from '../screens/worker/ReportSubmissionScreen';
import ReportDetailScreen from '../screens/worker/ReportDetailScreen';
import LocationTrackingScreen from '../screens/worker/LocationTrackingScreen';

const Tab = createBottomTabNavigator<WorkerTabParamList>();
const Stack = createNativeStackNavigator<WorkerStackParamList>();

function WorkerTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#10B981', // green-500
        tabBarInactiveTintColor: '#9CA3AF', // gray-400
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      <Tab.Screen
        name="WorkerHome"
        component={WorkerHomeScreen}
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="WorkerReports"
        component={WorkerReportsScreen}
        options={{
          title: 'Laporan',
          tabBarIcon: ({ color, size }) => (
            <Icon name="file-document" size={size} color={color} />
          ),
          tabBarBadge: undefined, // Set dynamically from state
        }}
      />
      <Tab.Screen
        name="WorkerProfile"
        component={WorkerProfileScreen}
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Icon name="account" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function WorkerNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="WorkerTabs" component={WorkerTabs} />

      {/* Modal Screens */}
      <Stack.Group
        screenOptions={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}>
        <Stack.Screen
          name="ClockInOut"
          component={ClockInOutScreen}
          options={{
            headerShown: true,
            headerTitle: 'Clock In/Out',
          }}
        />
        <Stack.Screen
          name="ReportSubmission"
          component={ReportSubmissionScreen}
          options={{
            headerShown: true,
            headerTitle: 'Buat Laporan',
          }}
        />
      </Stack.Group>

      {/* Push Screens */}
      <Stack.Group
        screenOptions={{
          animation: 'slide_from_right',
        }}>
        <Stack.Screen
          name="ReportDetail"
          component={ReportDetailScreen}
          options={{
            headerShown: true,
            headerTitle: 'Detail Laporan',
          }}
        />
        <Stack.Screen
          name="LocationTracking"
          component={LocationTrackingScreen}
          options={{
            headerShown: true,
            headerTitle: 'Pelacakan Lokasi',
          }}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
}

export default WorkerNavigator;
```

### Tab Badge (Dynamic)

```typescript
// Update tab badge based on pending sync count
import { useAppSelector } from '../store/hooks';

function WorkerTabs() {
  const pendingSyncCount = useAppSelector((state) => state.offline.queue.length);

  return (
    <Tab.Navigator>
      <Tab.Screen
        name="WorkerReports"
        component={WorkerReportsScreen}
        options={{
          title: 'Laporan',
          tabBarBadge: pendingSyncCount > 0 ? pendingSyncCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#EF4444', // red-500
          },
        }}
      />
    </Tab.Navigator>
  );
}
```

---

## Supervisor Navigator

### Tab Navigator Implementation

```typescript
// navigation/SupervisorNavigator.tsx

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { SupervisorTabParamList, SupervisorStackParamList } from '../types/navigation.types';

// Tab Screens
import SupervisorMapScreen from '../screens/supervisor/SupervisorMapScreen';
import SupervisorReportsScreen from '../screens/supervisor/SupervisorReportsScreen';
import SupervisorAttendanceScreen from '../screens/supervisor/SupervisorAttendanceScreen';
import SupervisorProfileScreen from '../screens/supervisor/SupervisorProfileScreen';

// Push Screens
import ReportDetailScreen from '../screens/supervisor/ReportDetailScreen';
import WorkerDetailScreen from '../screens/supervisor/WorkerDetailScreen';

const Tab = createBottomTabNavigator<SupervisorTabParamList>();
const Stack = createNativeStackNavigator<SupervisorStackParamList>();

function SupervisorTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3B82F6', // blue-500
        tabBarInactiveTintColor: '#9CA3AF', // gray-400
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      <Tab.Screen
        name="SupervisorMap"
        component={SupervisorMapScreen}
        options={{
          title: 'Peta',
          tabBarIcon: ({ color, size }) => (
            <Icon name="map-marker-multiple" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SupervisorReports"
        component={SupervisorReportsScreen}
        options={{
          title: 'Laporan',
          tabBarIcon: ({ color, size }) => (
            <Icon name="file-document-multiple" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SupervisorAttendance"
        component={SupervisorAttendanceScreen}
        options={{
          title: 'Kehadiran',
          tabBarIcon: ({ color, size }) => (
            <Icon name="calendar-check" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SupervisorProfile"
        component={SupervisorProfileScreen}
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Icon name="account" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function SupervisorNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen name="SupervisorTabs" component={SupervisorTabs} />

      {/* Push Screens */}
      <Stack.Group
        screenOptions={{
          animation: 'slide_from_right',
        }}>
        <Stack.Screen
          name="ReportDetail"
          component={ReportDetailScreen}
          options={{
            headerShown: true,
            headerTitle: 'Detail Laporan',
          }}
        />
        <Stack.Screen
          name="WorkerDetail"
          component={WorkerDetailScreen}
          options={{
            headerShown: true,
            headerTitle: 'Detail Pekerja',
          }}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
}

export default SupervisorNavigator;
```

---

## Navigation Patterns

### Navigation Hook (Type-Safe)

```typescript
// Using typed navigation in screens

import { useNavigation } from '@react-navigation/native';
import type { WorkerStackScreenProps } from '../types/navigation.types';

// In WorkerHomeScreen
type Props = WorkerStackScreenProps<'WorkerHome'>;

function WorkerHomeScreen({ navigation, route }: Props) {
  const handleClockIn = () => {
    navigation.navigate('ClockInOut', { mode: 'clock-in' });
  };

  return (
    <View>
      <Button onPress={handleClockIn} title="Clock In" />
    </View>
  );
}
```

### Route Parameters

```typescript
// Passing parameters
navigation.navigate('ReportDetail', { reportId: '123' });

// Receiving parameters
type Props = WorkerStackScreenProps<'ReportDetail'>;

function ReportDetailScreen({ route }: Props) {
  const { reportId } = route.params;
  // Use reportId to fetch data
}
```

### Going Back

```typescript
// Simple back
navigation.goBack();

// Back with data (Phase 2+)
navigation.navigate('WorkerHome', { refreshed: true });

// Back to specific screen
navigation.navigate('WorkerTabs', { screen: 'WorkerHome' });

// Back to root
navigation.popToTop();
```

### Reset Navigation Stack

```typescript
// After logout, reset to Login
import { CommonActions } from '@react-navigation/native';

navigation.dispatch(
  CommonActions.reset({
    index: 0,
    routes: [{ name: 'Login' }],
  })
);
```

---

## Navigation Guards

### Authentication Guard

```typescript
// Already handled by RootNavigator conditional rendering
// No additional guard needed

// Optional: Prevent back navigation after login
import { useEffect } from 'react';
import { BackHandler } from 'react-native';

function WorkerHomeScreen() {
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        // Prevent back to login
        return true; // Return true to disable back
      }
    );

    return () => backHandler.remove();
  }, []);
}
```

### Role-Based Access

```typescript
// Access control handled by RootNavigator
// Worker cannot access SupervisorTabs and vice versa

// Additional check in shared screens (e.g., ReportDetail)
function ReportDetailScreen() {
  const { user } = useAppSelector((state) => state.auth);

  if (user?.role === 'worker') {
    // Show worker view
  } else {
    // Show supervisor view
  }
}
```

### Shift Guard (Worker)

```typescript
// Prevent certain actions without active shift

function ReportSubmissionScreen({ navigation }: Props) {
  const { currentShift } = useAppSelector((state) => state.shift);

  useEffect(() => {
    if (!currentShift) {
      Alert.alert(
        'Tidak Ada Shift Aktif',
        'Anda harus clock in terlebih dahulu',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  }, [currentShift, navigation]);

  if (!currentShift) {
    return null; // Or loading spinner
  }

  return (
    // ... screen content
  );
}
```

---

## Screen Transitions

### Transition Types

**Default (Push/Pop):**
```typescript
screenOptions={{
  animation: 'slide_from_right', // iOS default
}}
```

**Modal:**
```typescript
screenOptions={{
  presentation: 'modal',
  animation: 'slide_from_bottom', // Android default
}}
```

**Fade:**
```typescript
screenOptions={{
  animation: 'fade',
}}
```

**None:**
```typescript
screenOptions={{
  animation: 'none',
}}
```

### Custom Transitions (Phase 2+)

```typescript
import { CardStyleInterpolators } from '@react-navigation/stack';

screenOptions={{
  cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
}}
```

---

## Header Configuration

### Header Presets

**Default Header:**
```typescript
options={{
  headerShown: true,
  headerTitle: 'Screen Title',
  headerTitleAlign: 'center',
  headerStyle: {
    backgroundColor: '#10B981', // green-500
  },
  headerTintColor: '#FFFFFF',
  headerTitleStyle: {
    fontWeight: 'bold',
  },
}}
```

**Header with Actions:**
```typescript
options={{
  headerShown: true,
  headerTitle: 'Laporan Kerja',
  headerRight: () => (
    <TouchableOpacity onPress={handleFilter}>
      <Icon name="filter" size={24} color="#FFFFFF" />
    </TouchableOpacity>
  ),
}}
```

**Custom Header:**
```typescript
options={{
  header: ({ navigation, route, options }) => (
    <CustomHeader
      title={options.title}
      onBack={() => navigation.goBack()}
    />
  ),
}}
```

**No Header:**
```typescript
options={{
  headerShown: false,
}}
```

---

## Bottom Tab Bar

### Hide Tab Bar on Specific Screens

```typescript
// In modal screens, tab bar is automatically hidden
// For push screens, manually hide:

options={{
  tabBarStyle: { display: 'none' },
}}

// Or dynamically:
useEffect(() => {
  navigation.getParent()?.setOptions({
    tabBarStyle: { display: 'none' },
  });

  return () => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'flex' },
    });
  };
}, [navigation]);
```

### Custom Tab Bar (Phase 2+)

```typescript
import { BottomTabBar } from '@react-navigation/bottom-tabs';

function CustomTabBar(props) {
  const { pendingSyncCount } = useAppSelector((state) => state.offline);

  return (
    <View>
      {pendingSyncCount > 0 && (
        <View style={styles.syncBanner}>
          <Text>⏳ {pendingSyncCount} item menunggu sinkronisasi</Text>
        </View>
      )}
      <BottomTabBar {...props} />
    </View>
  );
}

<Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />}>
  {/* ... */}
</Tab.Navigator>
```

---

## Navigation Events

### Focus Events

```typescript
import { useFocusEffect } from '@react-navigation/native';

function WorkerHomeScreen() {
  useFocusEffect(
    React.useCallback(() => {
      // Screen is focused
      console.log('Screen focused');
      fetchData();

      return () => {
        // Screen is unfocused
        console.log('Screen unfocused');
      };
    }, [])
  );
}
```

### Navigation State Events

```typescript
import { useNavigationState } from '@react-navigation/native';

function MyComponent() {
  const routeName = useNavigationState(
    (state) => state.routes[state.index].name
  );

  useEffect(() => {
    console.log('Current route:', routeName);
  }, [routeName]);
}
```

### Before Remove Event (Confirm Exit)

```typescript
useEffect(() => {
  const unsubscribe = navigation.addListener('beforeRemove', (e) => {
    if (!hasUnsavedChanges) {
      // No unsaved changes, allow navigation
      return;
    }

    // Prevent default behavior
    e.preventDefault();

    // Prompt user
    Alert.alert(
      'Keluar?',
      'Anda memiliki perubahan yang belum disimpan. Yakin ingin keluar?',
      [
        { text: 'Tetap di Sini', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: () => navigation.dispatch(e.data.action),
        },
      ]
    );
  });

  return unsubscribe;
}, [navigation, hasUnsavedChanges]);
```

---

## Nested Navigation

### Accessing Parent Navigator

```typescript
// From a tab screen, access stack navigator
const parentNavigation = navigation.getParent();

parentNavigation?.navigate('ClockInOut', { mode: 'clock-in' });
```

### Navigating to Nested Screen

```typescript
// From outside, navigate to specific tab
navigation.navigate('WorkerTabs', {
  screen: 'WorkerReports',
  params: { filter: 'today' },
});
```

---

## Navigation Persistence (Phase 2+)

### Save/Restore Navigation State

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const NAVIGATION_STATE_KEY = 'navigation_state';

function RootNavigator() {
  const [isReady, setIsReady] = React.useState(false);
  const [initialState, setInitialState] = React.useState();

  React.useEffect(() => {
    const restoreState = async () => {
      try {
        const savedStateString = await AsyncStorage.getItem(NAVIGATION_STATE_KEY);
        const state = savedStateString ? JSON.parse(savedStateString) : undefined;

        if (state !== undefined) {
          setInitialState(state);
        }
      } finally {
        setIsReady(true);
      }
    };

    restoreState();
  }, []);

  if (!isReady) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer
      initialState={initialState}
      onStateChange={(state) =>
        AsyncStorage.setItem(NAVIGATION_STATE_KEY, JSON.stringify(state))
      }>
      {/* ... */}
    </NavigationContainer>
  );
}
```

---

## Testing Navigation

### Navigation Mock

```typescript
// __mocks__/navigation.ts

export const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
};

export const mockRoute = {
  params: {},
  key: 'mock-key',
  name: 'MockScreen',
};
```

### Test Example

```typescript
import { render, fireEvent } from '@testing-library/react-native';
import { mockNavigation } from '../__mocks__/navigation';
import WorkerHomeScreen from './WorkerHomeScreen';

describe('WorkerHomeScreen', () => {
  it('navigates to ClockInOut on button press', () => {
    const { getByText } = render(
      <WorkerHomeScreen navigation={mockNavigation} route={mockRoute} />
    );

    fireEvent.press(getByText('Clock In'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('ClockInOut', {
      mode: 'clock-in',
    });
  });
});
```

---

## Performance Optimization

### Lazy Loading Screens

```typescript
import React, { lazy, Suspense } from 'react';

const ReportDetailScreen = lazy(() => import('./ReportDetailScreen'));

function WorkerNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ReportDetail"
        component={(props) => (
          <Suspense fallback={<LoadingSpinner />}>
            <ReportDetailScreen {...props} />
          </Suspense>
        )}
      />
    </Stack.Navigator>
  );
}
```

### Prevent Unnecessary Re-renders

```typescript
import { memo } from 'react';

const WorkerHomeScreen = memo(({ navigation, route }: Props) => {
  // Component logic
});

export default WorkerHomeScreen;
```

---

## Navigation Best Practices

### DO

- Use typed navigation params
- Navigate from user actions (button press)
- Reset navigation stack after logout
- Use descriptive route names
- Handle back button behavior
- Test navigation flows
- Use focus effects for data refresh

### DON'T

- Navigate in useEffect without dependency
- Access navigation outside of screen components
- Nest navigators unnecessarily
- Pass large objects in params (use IDs)
- Ignore back button on Android
- Navigate during render
- Create circular navigation flows

---

## Debugging Navigation

### Navigation Devtools

```typescript
import { useNavigationContainerRef } from '@react-navigation/native';

function App() {
  const navigationRef = useNavigationContainerRef();

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        console.log('Navigation ready');
        console.log('Initial route:', navigationRef.getCurrentRoute()?.name);
      }}
      onStateChange={(state) => {
        console.log('Navigation state changed:', state);
        const currentRoute = navigationRef.getCurrentRoute();
        console.log('Current route:', currentRoute?.name, currentRoute?.params);
      }}>
      {/* ... */}
    </NavigationContainer>
  );
}
```

### React Native Debugger

- Install React Native Debugger
- Enable "Debug JS Remotely"
- View navigation state in Redux DevTools
- Inspect navigation events in console

---

## Troubleshooting

### Issue: Cannot navigate after logout

**Solution:** Reset navigation stack
```typescript
navigation.dispatch(
  CommonActions.reset({
    index: 0,
    routes: [{ name: 'Login' }],
  })
);
```

### Issue: Tab bar not hiding on modal

**Solution:** Use presentation: 'modal'
```typescript
<Stack.Group screenOptions={{ presentation: 'modal' }}>
  <Stack.Screen name="ClockInOut" component={ClockInOutScreen} />
</Stack.Group>
```

### Issue: Type errors with navigation prop

**Solution:** Use typed screen props
```typescript
type Props = WorkerStackScreenProps<'WorkerHome'>;

function WorkerHomeScreen({ navigation }: Props) {
  // navigation is now fully typed
}
```

---

---

## Phase 2C: Navigation Restructure

> **Full specification:** See [`specs/phases/phase-2-c-client-feedback/mobile.md`](../phases/phase-2-c-client-feedback/mobile.md)

### Phase 2C Navigation Structure (Target)

The Phase 2A/2B dual-navigator approach (WorkerTabs + SupervisorTabs) is replaced with a **unified navigator** that dynamically renders tabs based on user role.

```
Root
├─ Auth Stack (Unauthenticated)
│  └─ Login
│
└─ Main Stack (Authenticated - all 8 roles)
   └─ MainTabs (dynamically configured per role)
      ├─ Home (Tab) ─── [satgas, linmas, korlap, admin_data, kepala_rayon]
      ├─ Aktivitas (Tab) ─── [satgas, linmas, korlap, admin_data]
      ├─ Tugas (Tab) ─── [satgas, linmas, korlap, kepala_rayon, top_mgmt, admin_sys, superadmin]
      ├─ Lembur (Tab) ─── [satgas, linmas]
      ├─ Monitoring (Tab) ─── [korlap, kepala_rayon, top_mgmt, admin_sys, superadmin]
      ├─ Profil (Tab) ─── [all roles]
      │
      ├─ ClockInOut (Modal)
      ├─ AktivitasSubmission (Modal)
      ├─ TaskDetail (Push)
      ├─ TaskComplete (Push)
      ├─ TaskCreate (Push)
      ├─ OvertimeSubmit (Push)
      ├─ OvertimeDetail (Push)
      └─ OvertimeApproval (Push)
```

### Role-Tab Matrix

| Role | Tab 1 | Tab 2 | Tab 3 | Tab 4 | Tab 5 |
|------|-------|-------|-------|-------|-------|
| satgas | Home | Aktivitas | Tugas | Lembur | Profil |
| linmas | Home | Aktivitas | Tugas | Lembur | Profil |
| korlap | Home | Aktivitas | Tugas | Monitoring | Profil |
| admin_data | Home | Aktivitas | Profil | - | - |
| kepala_rayon | Home | Tugas | Monitoring | Profil | - |
| top_management | Monitoring | Tugas | Profil | - | - |
| admin_system | Monitoring | Tugas | Profil | - | - |
| superadmin | Monitoring | Tugas | Profil | - | - |

---

**Document Owner:** Mobile Developer
**Last Updated:** 2026-02-10
**Status:** Active - Phase 2C Planning
**Related Docs:** [`screens.md`](./screens.md), [`state-management.md`](./state-management.md)
