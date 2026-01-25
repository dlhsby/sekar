// Mock react-native Alert component
// Use Object.defineProperty to ensure the mock is properly applied and cannot be overridden
const mockAlert = jest.fn();
const mockPrompt = jest.fn();

jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: mockAlert,
  prompt: mockPrompt,
}));

// Ensure Alert is properly mocked in all contexts
// This handles cases where Alert is imported before the mock is applied
const RN = require('react-native');
if (RN.Alert) {
  Object.defineProperty(RN.Alert, 'alert', {
    value: mockAlert,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(RN.Alert, 'prompt', {
    value: mockPrompt,
    writable: true,
    configurable: true,
  });
}

// Re-apply Alert mock before each test to ensure consistency
beforeEach(() => {
  // Ensure Alert mock is always available
  if (RN.Alert) {
    RN.Alert.alert = mockAlert;
    RN.Alert.prompt = mockPrompt;
  }
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
  addEventListener: jest.fn(() => jest.fn()),
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
      CAMERA: 'android.permission.CAMERA',
    },
    IOS: {
      LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
      CAMERA: 'ios.permission.CAMERA',
    },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
    LIMITED: 'limited',
    UNAVAILABLE: 'unavailable',
  },
  check: jest.fn(),
  request: jest.fn(),
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
  default: {
    getBatteryLevel: jest.fn(() => Promise.resolve(0.75)),
    getDeviceId: jest.fn(() => 'mock-device-id'),
    getUniqueId: jest.fn(() => Promise.resolve('mock-unique-id')),
    getFreeDiskStorage: jest.fn(() => Promise.resolve(5 * 1024 * 1024 * 1024)),
  },
}));

// Mock environment variables
global.API_BASE_URL = 'http://localhost:3000';
global.API_VERSION = 'v1';
global.GOOGLE_MAPS_API_KEY = 'mock-google-maps-key';
global.APP_ENV = 'test';

// Global cleanup hooks to prevent worker process leaks and mock pollution
afterEach(() => {
  // Clear all mock call counts and instances
  jest.clearAllMocks();

  // Clear all timers
  jest.clearAllTimers();

  // NOTE: Do NOT call jest.restoreAllMocks() here as it undoes jest.spyOn() mocks
  // set up in individual test files and can cause cross-test pollution
});

afterAll(() => {
  // Ensure real timers are restored after all tests
  jest.useRealTimers();

  // Clear any remaining timers
  jest.clearAllTimers();
});
