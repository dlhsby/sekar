/**
 * @format
 */

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';
import { initSentry } from './src/services/crashReporting/sentry';

// Initialize crash reporting as early as possible so startup errors are captured
// (Phase 4-1 B4). No-ops when SENTRY_DSN_MOBILE is unset (default in development).
initSentry();

/**
 * Register background message handler BEFORE AppRegistry.registerComponent
 *
 * This handler is called when the app receives a notification while in background or quit state.
 * It must be registered before the app component is registered.
 *
 * @see https://rnfirebase.io/messaging/usage#background-application-state
 */
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[Background] FCM Message received:', remoteMessage);

  // You can display a local notification here if needed
  // The notification will be handled by the OS by default
});

AppRegistry.registerComponent(appName, () => App);
