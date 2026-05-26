// Mock Alert before any other mocks to ensure it's available
// This mock is hoisted to the top automatically by Jest

// Store the implementation separately so we can restore it
const alertImplementation = (title, message, buttons) => {
  if (buttons && buttons.length > 0 && buttons[0].onPress) {
    buttons[0].onPress();
  }
};
const promptImplementation = () => {};

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  // Create mock functions with our implementation
  const mockAlert = jest.fn(alertImplementation);
  const mockPrompt = jest.fn(promptImplementation);
  const mockVibrate = jest.fn();
  const mockCancel = jest.fn();

  // Add Alert to RN without spreading (which triggers getters)
  RN.Alert = {
    alert: mockAlert,
    prompt: mockPrompt,
  };

  // Add Vibration mock
  RN.Vibration = {
    vibrate: mockVibrate,
    cancel: mockCancel,
  };

  // Store references globally so beforeEach can access them
  global.__ALERT_MOCK__ = mockAlert;
  global.__PROMPT_MOCK__ = mockPrompt;
  global.__VIBRATION_MOCK__ = mockVibrate;

  return RN;
});

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock react-native-geolocation-service
jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  requestAuthorization: jest.fn(),
}));

// Mock @react-native-community/netinfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()), // Returns unsubscribe function
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
    })
  ),
}));

// Mock react-native-image-picker
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

// Mock react-native-permissions
jest.mock('react-native-permissions', () => ({
  PERMISSIONS: {
    ANDROID: {
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
      ACCESS_BACKGROUND_LOCATION: 'android.permission.ACCESS_BACKGROUND_LOCATION',
      CAMERA: 'android.permission.CAMERA',
      READ_MEDIA_IMAGES: 'android.permission.READ_MEDIA_IMAGES',
      READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
    },
    IOS: {
      LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
      LOCATION_ALWAYS: 'ios.permission.LOCATION_ALWAYS',
      CAMERA: 'ios.permission.CAMERA',
      PHOTO_LIBRARY: 'ios.permission.PHOTO_LIBRARY',
    },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
    LIMITED: 'limited',
    UNAVAILABLE: 'unavailable',
  },
  check: jest.fn(() => Promise.resolve('granted')),
  request: jest.fn(() => Promise.resolve('granted')),
  checkNotifications: jest.fn(() => Promise.resolve({ status: 'granted', settings: {} })),
  requestNotifications: jest.fn(() => Promise.resolve({ status: 'granted', settings: {} })),
  openSettings: jest.fn(),
}));

// Mock react-native-fs
jest.mock('react-native-fs', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
  exists: jest.fn(),
  DocumentDirectoryPath: '/mock/path',
}));

// Mock react-native-encrypted-storage
jest.mock('react-native-encrypted-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-device-info
jest.mock('react-native-device-info', () => ({
  getBatteryLevel: jest.fn(() => Promise.resolve(0.75)), // Default 75%
  getDeviceId: jest.fn(() => 'mock-device-id'),
  getUniqueId: jest.fn(() => Promise.resolve('mock-unique-id')),
  getFreeDiskStorage: jest.fn(() => Promise.resolve(5 * 1024 * 1024 * 1024)), // Default 5GB free
  getVersion: jest.fn(() => '1.0.0'),
  getBuildNumber: jest.fn(() => '1'),
  default: {
    getBatteryLevel: jest.fn(() => Promise.resolve(0.75)),
    getDeviceId: jest.fn(() => 'mock-device-id'),
    getUniqueId: jest.fn(() => Promise.resolve('mock-unique-id')),
    getFreeDiskStorage: jest.fn(() => Promise.resolve(5 * 1024 * 1024 * 1024)),
    getVersion: jest.fn(() => '1.0.0'),
    getBuildNumber: jest.fn(() => '1'),
  },
}));

// Mock react-native-maps (requires native TurboModule — stub for Jest)
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockMapView = (props) => React.createElement(View, props, props.children);
  const MockMarker = (props) => React.createElement(View, props, props.children);
  const MockPolygon = (props) => React.createElement(View, props);
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polygon: MockPolygon,
    PROVIDER_GOOGLE: 'google',
    PROVIDER_DEFAULT: null,
  };
});

// Mock react-native-haptic-feedback
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
  HapticFeedbackTypes: {
    impactLight: 'impactLight',
    impactMedium: 'impactMedium',
    impactHeavy: 'impactHeavy',
    selection: 'selection',
    notificationSuccess: 'notificationSuccess',
    notificationWarning: 'notificationWarning',
    notificationError: 'notificationError',
  },
}));

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');

  const PatternComponent = (props) => React.createElement(View, props, props.children);

  const Leaf = (props) => React.createElement(View, props);
  const Group = (props) => React.createElement(View, props, props.children);

  return {
    __esModule: true,
    default: Group,
    Svg: Group,
    Rect: Leaf,
    Circle: Leaf,
    Line: Leaf,
    Path: Leaf,
    Polyline: Leaf,
    Polygon: Leaf,
    Ellipse: Leaf,
    Text: Group,
    G: Group,
    Defs: Group,
    ClipPath: Group,
    LinearGradient: Group,
    Stop: Leaf,
    Pattern: PatternComponent,
  };
});

// Mock @react-native-firebase/messaging (v23 modular API)
jest.mock('@react-native-firebase/messaging', () => {
  const mockInstance = {
    requestPermission: jest.fn(() => Promise.resolve(1)),
    hasPermission: jest.fn(() => Promise.resolve(1)),
    getToken: jest.fn(() => Promise.resolve('mock-fcm-token')),
    deleteToken: jest.fn(() => Promise.resolve()),
    onTokenRefresh: jest.fn(() => jest.fn()),
    onMessage: jest.fn(() => jest.fn()),
    setBackgroundMessageHandler: jest.fn(),
    onNotificationOpenedApp: jest.fn(() => jest.fn()),
    getInitialNotification: jest.fn(() => Promise.resolve(null)),
  };

  return {
    __esModule: true,
    getMessaging: jest.fn(() => mockInstance),
    getToken: jest.fn(() => Promise.resolve('mock-fcm-token')),
    requestPermission: jest.fn(() => Promise.resolve(1)),
    hasPermission: jest.fn(() => Promise.resolve(1)),
    deleteToken: jest.fn(() => Promise.resolve()),
    onMessage: jest.fn(() => jest.fn()),
    onTokenRefresh: jest.fn(() => jest.fn()),
    getInitialNotification: jest.fn(() => Promise.resolve(null)),
    onNotificationOpenedApp: jest.fn(() => jest.fn()),
    FirebaseMessagingTypes: {
      AuthorizationStatus: {
        AUTHORIZED: 1,
        DENIED: 0,
        NOT_DETERMINED: -1,
        PROVISIONAL: 2,
      },
    },
  };
});

// Mock @notifee/react-native (Phase 2 - Local Notifications)
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    displayNotification: jest.fn().mockResolvedValue(undefined),
    createChannel: jest.fn().mockResolvedValue('default'),
    getInitialNotification: jest.fn().mockResolvedValue(null),
    onBackgroundEvent: jest.fn(),
    onForegroundEvent: jest.fn(() => jest.fn()),
    cancelNotification: jest.fn().mockResolvedValue(undefined),
    cancelAllNotifications: jest.fn().mockResolvedValue(undefined),
    getBadgeCount: jest.fn().mockResolvedValue(0),
    setBadgeCount: jest.fn().mockResolvedValue(undefined),
    requestPermission: jest.fn().mockResolvedValue({ authorizationStatus: 1 }),
  },
  AndroidImportance: {
    HIGH: 4,
    DEFAULT: 3,
    LOW: 2,
    MIN: 1,
    NONE: 0,
  },
  EventType: {
    DISMISSED: 0,
    PRESS: 1,
    ACTION_PRESS: 2,
    DELIVERED: 3,
  },
}));

// Mock socket.io-client (Phase 2 - WebSocket)
jest.mock('socket.io-client', () => {
  const mockSocket = {
    connected: false,
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn((event, data, callback) => {
      if (callback && typeof callback === 'function') {
        callback({ success: true });
      }
    }),
    disconnect: jest.fn(),
  };

  const io = jest.fn(() => mockSocket);
  io.mockSocket = mockSocket;

  return io;
});

// Mock environment variables
global.API_BASE_URL = 'http://localhost:3000';
global.API_VERSION = 'v1';
global.GOOGLE_MAPS_API_KEY = 'mock-google-maps-key';
global.APP_ENV = 'test';

// Global setup hook to ensure Alert and Vibration mocks are always available
beforeEach(() => {
  // CRITICAL: Restore Alert mock implementation before each test
  // This runs before EVERY test, ensuring the mock is always functional
  // even after jest.clearAllMocks() has been called

  if (global.__ALERT_MOCK__ && global.__PROMPT_MOCK__) {
    // Restore the implementation if it was cleared
    global.__ALERT_MOCK__.mockImplementation(alertImplementation);
    global.__PROMPT_MOCK__.mockImplementation(promptImplementation);

    // Also ensure RN.Alert is set up correctly
    const RN = require('react-native');
    if (!RN.Alert || typeof RN.Alert.alert !== 'function') {
      RN.Alert = {
        alert: global.__ALERT_MOCK__,
        prompt: global.__PROMPT_MOCK__,
      };
    } else {
      RN.Alert.alert = global.__ALERT_MOCK__;
      RN.Alert.prompt = global.__PROMPT_MOCK__;
    }

    // Also ensure RN.Vibration is set up correctly
    if (global.__VIBRATION_MOCK__) {
      if (!RN.Vibration || typeof RN.Vibration.vibrate !== 'function') {
        RN.Vibration = {
          vibrate: global.__VIBRATION_MOCK__,
          cancel: jest.fn(),
        };
      } else {
        RN.Vibration.vibrate = global.__VIBRATION_MOCK__;
      }
    }
  }
});

// Global cleanup hooks to prevent worker process leaks and mock pollution
afterEach(() => {
  // Clear all timers
  jest.clearAllTimers();

  // IMPORTANT: Do NOT call jest.clearAllMocks() here as it breaks the global Alert mock
  // Individual test files should clear their specific mocks manually

  // NOTE: Do NOT call jest.restoreAllMocks() here as it undoes jest.spyOn() mocks
  // set up in individual test files and can cause cross-test pollution
});

afterAll(() => {
  // Ensure real timers are restored after all tests
  jest.useRealTimers();

  // Clear any remaining timers
  jest.clearAllTimers();
});
