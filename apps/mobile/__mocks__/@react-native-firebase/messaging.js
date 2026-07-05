/**
 * Mock for @react-native-firebase/messaging
 */

const messaging = jest.fn(() => ({
  requestPermission: jest.fn(() => Promise.resolve(1)), // AUTHORIZED
  hasPermission: jest.fn(() => Promise.resolve(1)),
  getToken: jest.fn(() => Promise.resolve('mock-fcm-token')),
  deleteToken: jest.fn(() => Promise.resolve()),
  onTokenRefresh: jest.fn(() => jest.fn()),
  onMessage: jest.fn(() => jest.fn()),
  setBackgroundMessageHandler: jest.fn(),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  getInitialNotification: jest.fn(() => Promise.resolve(null)),
  AuthorizationStatus: {
    AUTHORIZED: 1,
    DENIED: 0,
    NOT_DETERMINED: -1,
    PROVISIONAL: 2,
  },
}));

messaging.AuthorizationStatus = {
  AUTHORIZED: 1,
  DENIED: 0,
  NOT_DETERMINED: -1,
  PROVISIONAL: 2,
};

export default messaging;
