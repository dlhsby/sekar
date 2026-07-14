# Mobile Testing Specifications - SEKAR

## Overview

This document provides comprehensive testing guidelines for the SEKAR mobile app (React Native + TypeScript + Redux). It covers component testing, navigation testing, Redux testing, offline sync testing, and permission mocking.

**Current Status (February 20, 2026):**
- **3,099 tests passing** (125 test suites)
- **Phase 2C:** Activity approval, task acceptance/verification, 8-role system
- Coverage: Maintained >80% (exact coverage numbers from `npm run test:cov`)

**Previous Status (January 26, 2026):**
- 2,000+ tests (82+ suites), 80.31% overall coverage

**Recent Coverage Improvements (Session 4 - January 26, 2026):**
- ✅ **TestNavigator.tsx**: 0% → Excluded (istanbul ignore)
- ✅ **apiClient.ts**: 41.28% → 62.38% statements (+21.1%) - 25 tests
  - Added token refresh tests (401 error handling)
  - Network error handling tests
  - Request/response interceptor tests
  - Generic HTTP methods (GET, POST, PUT, DELETE) tests
- ✅ **websocketService.ts**: 41.87% → 59.11% statements (+17.24%) - 49 tests
  - Connection lifecycle tests
  - Reconnection logic with exponential backoff
  - Room subscription/unsubscription tests
  - Event listener management tests
  - Edge case handling (timeouts, failures, cleanup)

**Previous Sessions (Session 1-3):**
- ✅ MapErrorBoundary: 0% → 100% statements (24 tests)
- ✅ TasksReportsScreen: 0% → 78.57% statements (41 tests)
- ✅ nbShadow utilities: 0% → 100% statements (38 tests)
- ✅ AuthProvider: 100% statements, 95% branches coverage (17 tests)
- ✅ NetworkProvider: 95.83% statements, 100% branches coverage (12 tests)
- ✅ tokenUtils: 96% statements, 95.23% branches coverage (23 tests)
- ✅ Button component: 100% coverage (10 tests)
- ✅ mediaService: 91.04% branches coverage (18 tests)

---

## Table of Contents

1. [Component Testing](#component-testing)
2. [Navigation Testing](#navigation-testing)
3. [Redux Testing](#redux-testing)
4. [Utility Function Testing](#utility-function-testing)
5. [Offline Sync Testing](#offline-sync-testing)
6. [Permission & Native Module Mocking](#permission--native-module-mocking)
7. [Integration Testing](#integration-testing)
8. [E2E Testing (Future)](#e2e-testing-future)
9. [Common Patterns](#common-patterns)
10. [Troubleshooting](#troubleshooting)

---

## Component Testing

### Test File Structure

Place test files in `__tests__/` folders adjacent to components:

```
src/
├── components/
│   ├── WorkerClockIn/
│   │   ├── WorkerClockIn.tsx
│   │   └── __tests__/
│   │       └── WorkerClockIn.test.tsx
│   └── MapView/
│       ├── MapView.tsx
│       └── __tests__/
│           └── MapView.test.tsx
```

### Basic Component Test Template

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { WorkerClockIn } from '../WorkerClockIn';

describe('WorkerClockIn Component', () => {
  const mockOnClockIn = jest.fn();
  const mockOnClockOut = jest.fn();

  const defaultProps = {
    currentShift: null,
    onClockIn: mockOnClockIn,
    onClockOut: mockOnClockOut,
    loading: false,
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render clock-in button when not clocked in', () => {
    const { getByText } = render(<WorkerClockIn {...defaultProps} />);

    expect(getByText('Clock In')).toBeTruthy();
  });

  it('should render clock-out button when clocked in', () => {
    const props = {
      ...defaultProps,
      currentShift: {
        id: '123',
        clock_in_time: new Date().toISOString(),
        area_name: 'Taman Bungkul',
      },
    };

    const { getByText } = render(<WorkerClockIn {...props} />);

    expect(getByText('Clock Out')).toBeTruthy();
    expect(getByText('Taman Bungkul')).toBeTruthy();
  });

  it('should call onClockIn when clock-in button is pressed', () => {
    const { getByText } = render(<WorkerClockIn {...defaultProps} />);

    fireEvent.press(getByText('Clock In'));

    expect(mockOnClockIn).toHaveBeenCalledTimes(1);
  });

  it('should disable button while loading', () => {
    const props = { ...defaultProps, loading: true };
    const { getByText } = render(<WorkerClockIn {...props} />);

    const button = getByText('Clock In');
    expect(button.props.accessibilityState.disabled).toBe(true);
  });
});
```

### Testing with Redux

Use a custom render function that wraps components with Redux Provider:

```typescript
// test-utils/redux-wrapper.tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/slices/authSlice';
import shiftReducer from '../store/slices/shiftSlice';

export const renderWithRedux = (
  component: React.ReactElement,
  initialState = {},
) => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      shift: shiftReducer,
    },
    preloadedState: initialState,
  });

  return {
    ...render(<Provider store={store}>{component}</Provider>),
    store,
  };
};

// Usage in tests
import { renderWithRedux } from '../../test-utils/redux-wrapper';

it('should display user name from Redux store', () => {
  const initialState = {
    auth: {
      user: { full_name: 'Test Worker' },
      isAuthenticated: true,
    },
  };

  const { getByText } = renderWithRedux(<HomeScreen />, initialState);

  expect(getByText('Welcome, Test Worker')).toBeTruthy();
});
```

### Testing User Interactions

```typescript
import { render, fireEvent, waitFor } from '@testing-library/react-native';

describe('LoginScreen', () => {
  it('should update input fields on change', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);

    const usernameInput = getByPlaceholderText('Username');
    fireEvent.changeText(usernameInput, 'worker1');

    expect(usernameInput.props.value).toBe('worker1');
  });

  it('should show error message on failed login', async () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    fireEvent.changeText(getByPlaceholderText('Username'), 'worker1');
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrongpassword');
    fireEvent.press(getByText('Login'));

    await waitFor(() => {
      expect(getByText('Invalid credentials')).toBeTruthy();
    });
  });
});
```

### Snapshot Testing

Use snapshots for component structure validation:

```typescript
it('should match snapshot', () => {
  const { toJSON } = render(<WorkerCard worker={mockWorker} />);

  expect(toJSON()).toMatchSnapshot();
});
```

**When to use snapshots:**
- Static UI components
- Card/list item layouts
- Icon/badge components

**When NOT to use snapshots:**
- Dynamic data-driven components
- Components with complex state
- Components with frequent changes

---

## Navigation Testing

### Mocking React Navigation

**__mocks__/@react-navigation/native.ts**

```typescript
export const useNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
});

export const useRoute = () => ({
  params: {},
  key: 'test-route',
  name: 'TestScreen',
});

export const NavigationContainer = ({ children }: any) => children;
```

### Testing Navigation Actions

```typescript
import { useNavigation } from '@react-navigation/native';

jest.mock('@react-navigation/native');

describe('Navigation', () => {
  const mockNavigate = jest.fn();

  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });
  });

  it('should navigate to report screen on button press', () => {
    const { getByText } = render(<HomeScreen />);

    fireEvent.press(getByText('New Report'));

    expect(mockNavigate).toHaveBeenCalledWith('ReportScreen');
  });

  it('should pass parameters when navigating', () => {
    const { getByText } = render(<WorkerList />);

    fireEvent.press(getByText('View Details'));

    expect(mockNavigate).toHaveBeenCalledWith('WorkerDetail', {
      workerId: '123',
    });
  });
});
```

### Testing Route Parameters

```typescript
import { useRoute } from '@react-navigation/native';

jest.mock('@react-navigation/native');

it('should display data from route params', () => {
  (useRoute as jest.Mock).mockReturnValue({
    params: { areaName: 'Taman Bungkul' },
  });

  const { getByText } = render(<AreaDetailScreen />);

  expect(getByText('Taman Bungkul')).toBeTruthy();
});
```

---

## Redux Testing

### Testing Slices (Reducers)

```typescript
import authReducer, {
  loginSuccess,
  logout,
  setUser,
} from '../authSlice';

describe('authSlice', () => {
  const initialState = {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  };

  it('should return initial state', () => {
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle loginSuccess', () => {
    const user = { id: '123', username: 'worker1', role: 'Worker' };
    const token = 'jwt.token.here';

    const actual = authReducer(initialState, loginSuccess({ user, token }));

    expect(actual.user).toEqual(user);
    expect(actual.token).toBe(token);
    expect(actual.isAuthenticated).toBe(true);
  });

  it('should handle logout', () => {
    const authenticatedState = {
      ...initialState,
      user: { id: '123', username: 'worker1', role: 'Worker' },
      token: 'jwt.token.here',
      isAuthenticated: true,
    };

    const actual = authReducer(authenticatedState, logout());

    expect(actual).toEqual(initialState);
  });
});
```

### Testing Thunks (Async Actions)

```typescript
import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { loginUser } from '../authSlice';
import * as apiClient from '../../services/api/apiClient';

const middlewares = [thunk];
const mockStore = configureStore(middlewares);

jest.mock('../../services/api/apiClient');

describe('authSlice thunks', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should dispatch loginSuccess on successful login', async () => {
    const mockResponse = {
      access_token: 'jwt.token',
      user: { id: '123', username: 'worker1', role: 'Worker' },
    };

    (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

    const store = mockStore({});
    const credentials = { username: 'worker1', password: '12345678' };

    await store.dispatch(loginUser(credentials) as any);

    const actions = store.getActions();
    expect(actions[0].type).toBe('auth/loginUser/pending');
    expect(actions[1].type).toBe('auth/loginUser/fulfilled');
    expect(actions[1].payload).toEqual(mockResponse);
  });

  it('should dispatch loginFailure on failed login', async () => {
    (apiClient.post as jest.Mock).mockRejectedValue(
      new Error('Invalid credentials'),
    );

    const store = mockStore({});
    const credentials = { username: 'worker1', password: 'wrong' };

    await store.dispatch(loginUser(credentials) as any);

    const actions = store.getActions();
    expect(actions[0].type).toBe('auth/loginUser/pending');
    expect(actions[1].type).toBe('auth/loginUser/rejected');
  });
});
```

### Testing Selectors

```typescript
import { selectCurrentUser, selectIsAuthenticated } from '../authSlice';

describe('authSlice selectors', () => {
  const state = {
    auth: {
      user: { id: '123', username: 'worker1', role: 'Worker' },
      token: 'jwt.token',
      isAuthenticated: true,
    },
  };

  it('should select current user', () => {
    expect(selectCurrentUser(state as any)).toEqual(state.auth.user);
  });

  it('should select authentication status', () => {
    expect(selectIsAuthenticated(state as any)).toBe(true);
  });
});
```

---

## Utility Function Testing

### Testing GPS Utilities

```typescript
import * as gpsUtils from '../gpsUtils';

describe('GPS Utils', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const distance = gpsUtils.calculateDistance(
        -7.2458, 112.7378, // Tugu Pahlawan
        -7.2575, 112.7521  // Balai Kota
      );

      expect(distance).toBeGreaterThan(2000);
      expect(distance).toBeLessThan(2100);
    });

    it('should return 0 for same coordinates', () => {
      const distance = gpsUtils.calculateDistance(
        -7.2905, 112.7398,
        -7.2905, 112.7398
      );

      expect(distance).toBe(0);
    });
  });

  describe('isWithinBoundary', () => {
    it('should return true when within boundary', () => {
      const result = gpsUtils.isWithinBoundary(
        -7.2905, 112.7398,
        -7.2905, 112.7398,
        100
      );

      expect(result).toBe(true);
    });

    it('should return false when outside boundary', () => {
      const result = gpsUtils.isWithinBoundary(
        -7.2905, 112.7398,
        -7.2915, 112.7408,
        100
      );

      expect(result).toBe(false);
    });
  });
});
```

### Testing Date Utilities

```typescript
import { formatDate, isToday, calculateHours } from '../dateUtils';

describe('Date Utils', () => {
  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2026-01-15T10:30:00Z');
      expect(formatDate(date, 'DD/MM/YYYY')).toBe('15/01/2026');
    });
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });
  });

  describe('calculateHours', () => {
    it('should calculate hours between two times', () => {
      const start = new Date('2026-01-15T08:00:00Z');
      const end = new Date('2026-01-15T16:00:00Z');

      expect(calculateHours(start, end)).toBe(8);
    });
  });
});
```

---

## Offline Sync Testing

### Testing Offline Queue

```typescript
import { OfflineQueue } from '../offlineQueue';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');

describe('OfflineQueue', () => {
  beforeEach(() => {
    AsyncStorage.clear();
  });

  it('should add item to queue', async () => {
    const queue = new OfflineQueue();
    const item = { type: 'CLOCK_IN', data: { location_id: '123' } };

    await queue.add(item);

    const items = await queue.getAll();
    expect(items).toHaveLength(1);
    expect(items[0].data).toEqual(item.data);
  });

  it('should remove item from queue', async () => {
    const queue = new OfflineQueue();
    const item = { type: 'CLOCK_IN', data: { location_id: '123' } };

    const id = await queue.add(item);
    await queue.remove(id);

    const items = await queue.getAll();
    expect(items).toHaveLength(0);
  });

  it('should process queue when online', async () => {
    const queue = new OfflineQueue();
    const mockProcess = jest.fn().mockResolvedValue(true);

    await queue.add({ type: 'CLOCK_IN', data: {} });
    await queue.add({ type: 'REPORT', data: {} });

    await queue.processAll(mockProcess);

    expect(mockProcess).toHaveBeenCalledTimes(2);
  });
});
```

### Testing Sync Logic

```typescript
import { syncOfflineData } from '../syncService';
import * as apiClient from '../apiClient';

jest.mock('../apiClient');

describe('Sync Service', () => {
  it('should sync queued shifts', async () => {
    const queuedShift = {
      type: 'CLOCK_IN',
      data: { location_id: '123', gps_lat: -7.2905, gps_lng: 112.7398 },
    };

    (apiClient.post as jest.Mock).mockResolvedValue({ shift_id: '456' });

    await syncOfflineData([queuedShift]);

    expect(apiClient.post).toHaveBeenCalledWith('/api/shifts/clock-in', queuedShift.data);
  });

  it('should handle sync errors gracefully', async () => {
    const queuedItem = { type: 'REPORT', data: {} };
    (apiClient.post as jest.Mock).mockRejectedValue(new Error('Network error'));

    await expect(syncOfflineData([queuedItem])).resolves.not.toThrow();
  });
});
```

---

## Permission & Native Module Mocking

### Mocking Geolocation

**__mocks__/react-native-geolocation-service.ts**

```typescript
const mockGeolocation = {
  getCurrentPosition: jest.fn((success, error, options) => {
    success({
      coords: {
        latitude: -7.2905,
        longitude: 112.7398,
        accuracy: 10,
        altitude: 0,
        altitudeAccuracy: 0,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    });
  }),
  watchPosition: jest.fn(() => 1),
  clearWatch: jest.fn(),
  requestAuthorization: jest.fn().mockResolvedValue('granted'),
};

export default mockGeolocation;
```

### Mocking Permissions

**__mocks__/react-native-permissions.ts**

```typescript
export const PERMISSIONS = {
  ANDROID: {
    ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    CAMERA: 'android.permission.CAMERA',
  },
};

export const RESULTS = {
  GRANTED: 'granted',
  DENIED: 'denied',
  BLOCKED: 'blocked',
};

export const check = jest.fn().mockResolvedValue(RESULTS.GRANTED);
export const request = jest.fn().mockResolvedValue(RESULTS.GRANTED);
export const requestMultiple = jest.fn().mockResolvedValue({
  [PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION]: RESULTS.GRANTED,
  [PERMISSIONS.ANDROID.CAMERA]: RESULTS.GRANTED,
});
```

### Mocking Camera/Image Picker

**__mocks__/react-native-image-picker.ts**

```typescript
export const launchCamera = jest.fn((options, callback) => {
  callback({
    assets: [
      {
        uri: 'file://photo.jpg',
        type: 'image/jpeg',
        fileName: 'photo.jpg',
        fileSize: 1024000,
        width: 800,
        height: 600,
      },
    ],
  });
});

export const launchImageLibrary = jest.fn();
```

### Testing Permission Flow

```typescript
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { requestLocationPermission } from '../permissionService';

jest.mock('react-native-permissions');

describe('Permission Service', () => {
  it('should return true if permission already granted', async () => {
    (check as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

    const result = await requestLocationPermission();

    expect(result).toBe(true);
    expect(request).not.toHaveBeenCalled();
  });

  it('should request permission if not granted', async () => {
    (check as jest.Mock).mockResolvedValue(RESULTS.DENIED);
    (request as jest.Mock).mockResolvedValue(RESULTS.GRANTED);

    const result = await requestLocationPermission();

    expect(result).toBe(true);
    expect(request).toHaveBeenCalledWith(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
  });

  it('should return false if permission blocked', async () => {
    (check as jest.Mock).mockResolvedValue(RESULTS.BLOCKED);

    const result = await requestLocationPermission();

    expect(result).toBe(false);
  });
});
```

---

## Integration Testing

### Testing API Integration

```typescript
import axios from 'axios';
import { loginUser } from '../authService';

jest.mock('axios');

describe('Auth Service Integration', () => {
  it('should login and store token', async () => {
    const mockResponse = {
      data: {
        access_token: 'jwt.token',
        user: { id: '123', username: 'worker1' },
      },
    };

    (axios.post as jest.Mock).mockResolvedValue(mockResponse);

    const result = await loginUser('worker1', '12345678');

    expect(result.access_token).toBe('jwt.token');
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/login'),
      { username: 'worker1', password: '12345678' },
    );
  });
});
```

### Testing Complete User Flows

```typescript
describe('Clock In Flow', () => {
  it('should complete full clock-in process', async () => {
    // 1. Check permissions
    const hasPermission = await requestLocationPermission();
    expect(hasPermission).toBe(true);

    // 2. Get GPS location
    const location = await getCurrentLocation();
    expect(location).toHaveProperty('latitude');

    // 3. Take selfie
    const photo = await takeSelfie();
    expect(photo).toHaveProperty('uri');

    // 4. Send to API
    const result = await clockIn({
      location_id: '123',
      gps_lat: location.latitude,
      gps_lng: location.longitude,
      selfie_photo: photo.uri,
    });

    expect(result).toHaveProperty('shift_id');
  });
});
```

---

### Phase 2D Monitoring Mobile Tests

| Screen/Component | Test Coverage | Key Test Cases |
|------------------|--------------|----------------|
| MapDashboardScreen | Unit + Integration | Map render, marker colors by status, summary bar counts, filter selection, user tap → detail sheet |
| UserDetailSheet | Unit | User info display, status badge color, shift time, action buttons (call/WhatsApp), close gesture |
| LocationTrail | Unit | Trail point rendering, date navigation, distance summary, map sync |
| LocationStatusCard | Unit | GPS coords display, accuracy badge, area status banner (green/orange), refresh button, visibility gate (shift active) |
| useHomeLocation | Hook test | getCurrentLocation call, boundary check, refresh triggers captureNow+forceUpload, error handling |
| MonitoringSummaryBar | Unit | 5 status counts, color coding, tap filter interaction |

---

## E2E Testing (Future - Phase 3+)

### Detox Setup (Planned)

**detox.config.js**

```javascript
module.exports = {
  testRunner: 'jest',
  runnerConfig: 'e2e/config.json',
  apps: {
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug -x installDebug',
    },
  },
  devices: {
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_4_API_30',
      },
    },
  },
  configurations: {
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
  },
};
```

### Detox Test Example (Planned)

```typescript
describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should login successfully', async () => {
    await element(by.id('username-input')).typeText('worker1');
    await element(by.id('password-input')).typeText('12345678');
    await element(by.id('login-button')).tap();

    await expect(element(by.text('Welcome, Pekerja Satu'))).toBeVisible();
  });

  it('should clock in at area', async () => {
    await element(by.id('clock-in-button')).tap();
    await element(by.id('camera-capture')).tap();
    await element(by.id('confirm-clock-in')).tap();

    await expect(element(by.text('Clocked In'))).toBeVisible();
  });
});
```

---

## Common Testing Patterns

### Pattern 1: Testing Error States

```typescript
it('should display error message when API fails', async () => {
  (apiClient.post as jest.Mock).mockRejectedValue(
    new Error('Network error'),
  );

  const { getByText } = render(<ClockInScreen />);

  fireEvent.press(getByText('Clock In'));

  await waitFor(() => {
    expect(getByText('Failed to clock in. Please try again.')).toBeTruthy();
  });
});
```

### Pattern 2: Testing Loading States

```typescript
it('should show loading indicator while processing', async () => {
  const { getByTestId } = render(<ClockInScreen />);

  fireEvent.press(getByTestId('clock-in-button'));

  expect(getByTestId('loading-indicator')).toBeTruthy();
});
```

### Pattern 3: Testing Conditional Rendering

```typescript
it('should show different UI based on shift status', () => {
  const { rerender, getByText, queryByText } = render(
    <ShiftStatus currentShift={null} />
  );

  expect(getByText('Not Clocked In')).toBeTruthy();

  rerender(<ShiftStatus currentShift={mockShift} />);

  expect(queryByText('Not Clocked In')).toBeNull();
  expect(getByText('Active Shift')).toBeTruthy();
});
```

### Pattern 4: Testing Error Boundaries

Error boundaries require special setup since they catch errors during render:

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MapErrorBoundary } from '../MapErrorBoundary';

// Mock console.error to reduce noise
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

// Component that throws error on demand
const ProblemChild: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Map rendering failed');
  }
  return <Text testID="child-content">Map content</Text>;
};

describe('Error Boundary', () => {
  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  it('should catch errors and display fallback UI', () => {
    const { getByText, queryByTestId } = render(
      <MapErrorBoundary>
        <ProblemChild shouldThrow />
      </MapErrorBoundary>
    );

    expect(queryByTestId('child-content')).toBeNull();
    expect(getByText('Gagal Memuat Peta')).toBeTruthy();
  });

  it('should call onReset when retry is pressed', () => {
    const onReset = jest.fn();
    const { getByLabelText } = render(
      <MapErrorBoundary onReset={onReset}>
        <ProblemChild shouldThrow />
      </MapErrorBoundary>
    );

    fireEvent.press(getByLabelText('Coba lagi memuat peta'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
```

**Key Points:**
- Mock `console.error` to reduce test output noise
- Create a component that throws errors on demand
- Test both error state and reset functionality
- Verify fallback UI is displayed correctly
- Test in both development (`__DEV__`) and production modes

### Pattern 5: Testing Tab Navigation Screens

For screens with tab-based navigation:

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TasksReportsScreen } from '../TasksReportsScreen';

// Mock tab component
jest.mock('../../../components/nb/NBTab', () => ({
  NBTab: ({ label, active, onPress }: any) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity testID={`tab-${label.toLowerCase()}`} onPress={onPress}>
        <Text>{label}</Text>
        <Text testID={`tab-${label.toLowerCase()}-active`}>
          {active ? 'Active' : 'Inactive'}
        </Text>
      </TouchableOpacity>
    );
  },
}));

describe('TabScreen', () => {
  it('should switch tabs when pressed', () => {
    const { getByTestId, getByText } = render(<TasksReportsScreen {...props} />);

    // Initially on tasks tab
    expect(getByText('📋 Task list will be implemented here')).toBeTruthy();

    // Switch to reports
    fireEvent.press(getByTestId('tab-laporan'));
    expect(getByText('📊 Reports list will be implemented here')).toBeTruthy();
  });
});
```

### Pattern 6: Testing Utility Functions with Platform-Specific Behavior

For utilities like shadow generators that behave differently on iOS/Android:

```typescript
import { Platform } from 'react-native';
import { getNBShadow, getInteractiveShadow } from '../nbShadow';

describe('Shadow Utilities', () => {
  it('should generate proper shadow on iOS', () => {
    Platform.OS = 'ios';
    const shadow = getNBShadow('md');

    expect(shadow.shadowColor).toBe('#000000');
    expect(shadow.shadowOffset).toEqual({ width: 6, height: 6 });
  });

  it('should generate proper elevation on Android', () => {
    Platform.OS = 'android';
    const shadow = getNBShadow('md');

    expect(shadow.elevation).toBe(6);
  });

  it('should handle interactive states', () => {
    const { shadow, transform } = getInteractiveShadow(true);

    expect(transform).toEqual([
      { translateX: 2 },
      { translateY: 2 },
    ]);
  });
});
```

---

## Troubleshooting

### Common Issues

**Issue: Can't find module 'react-native'**
```bash
# Solution: Clear cache and reinstall
npm start -- --reset-cache
rm -rf node_modules && npm install
```

**Issue: Mock not working**
```typescript
// Solution: Ensure mock is in correct location
// __mocks__/module-name.ts should be sibling to node_modules
```

**Issue: AsyncStorage errors**
```typescript
// Solution: Mock AsyncStorage in jest.setup.js
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- gpsUtils.test.ts

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage

# Update snapshots
npm test -- -u

# Run tests with verbose output
npm test -- --verbose
```

---

## Resources

- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Redux Testing Guide](https://redux.js.org/usage/writing-tests)
- [Test Data & Fixtures](./test-data.md)
- [Overall Testing Strategy](./strategy.md)

---

*Last Updated: 2026-06-20*
*Current Status (Phase 5 code-side): 4,103+ tests passing, 73.65% stmt / 64.06% branch coverage*
