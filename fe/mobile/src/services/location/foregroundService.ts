/**
 * Location Foreground Service (4-V Gap 3)
 *
 * Android suspends JS timers when the app leaves the foreground (Doze /
 * app-standby), which froze location tracking the moment the screen turned
 * off. Hosting a Notifee foreground service (android:foregroundServiceType=
 * "location", persistent silent notification) keeps the process at foreground
 * priority so the LocationTracker's timer loop keeps firing for the whole
 * shift. While-in-use location permission is sufficient: the service starts
 * while the app is foregrounded (clock-in), which Android allows to continue
 * using location in the background.
 *
 * iOS does not use this path — background location there needs the
 * watchPosition + allowsBackgroundLocationUpdates migration (tracked in
 * status_reviews.md § Gap 3; UIBackgroundModes is already declared).
 */

import { Platform } from 'react-native';
import notifee, {
  AndroidImportance,
  AndroidForegroundServiceType,
} from '@notifee/react-native';
import i18n from '../../i18n/config';

const CHANNEL_ID = 'location-tracking';
const NOTIFICATION_ID = 'sekar-location-tracking';

let serviceRunning = false;
let resolveServiceRunner: (() => void) | null = null;
let runnerRegistered = false;

/**
 * Notifee invokes the registered runner when a notification is displayed with
 * `asForegroundService: true`; the service lives until the promise resolves.
 * Registration is idempotent and lazy so simply importing this module in
 * tests has no side effects.
 */
function ensureRunnerRegistered(): void {
  if (runnerRegistered) {
    return;
  }
  runnerRegistered = true;
  notifee.registerForegroundService(
    () =>
      new Promise<void>((resolve) => {
        resolveServiceRunner = resolve;
      }),
  );
}

/**
 * Start the persistent foreground service. Safe to call repeatedly; no-op on
 * iOS and when already running. Failures are logged, never thrown — tracking
 * still works with the app foregrounded even if the service can't start.
 */
export async function startLocationForegroundService(): Promise<void> {
  if (Platform.OS !== 'android' || serviceRunning) {
    return;
  }

  try {
    ensureRunnerRegistered();

    await notifee.createChannel({
      id: CHANNEL_ID,
      name: i18n.t('location:foregroundService.channelName'),
      importance: AndroidImportance.LOW, // silent — no sound/heads-up
    });

    await notifee.displayNotification({
      id: NOTIFICATION_ID,
      title: i18n.t('location:foregroundService.notificationTitle'),
      body: i18n.t('location:foregroundService.notificationBody'),
      android: {
        channelId: CHANNEL_ID,
        asForegroundService: true,
        // Android 14+ requires the service type at startForeground time
        foregroundServiceTypes: [AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_LOCATION],
        ongoing: true,
        pressAction: { id: 'default' },
        smallIcon: 'ic_launcher',
        colorized: false,
      },
    });

    serviceRunning = true;
    console.debug('[ForegroundService] Location foreground service started');
  } catch (error) {
    console.warn('[ForegroundService] Failed to start foreground service:', error);
  }
}

/** Stop the foreground service and remove its notification. Idempotent. */
export async function stopLocationForegroundService(): Promise<void> {
  if (Platform.OS !== 'android' || !serviceRunning) {
    return;
  }

  try {
    await notifee.stopForegroundService();
    await notifee.cancelNotification(NOTIFICATION_ID);
  } catch (error) {
    console.warn('[ForegroundService] Failed to stop foreground service:', error);
  } finally {
    serviceRunning = false;
    if (resolveServiceRunner) {
      resolveServiceRunner();
      resolveServiceRunner = null;
    }
    console.debug('[ForegroundService] Location foreground service stopped');
  }
}

/** Whether the foreground service is currently active (Android only) */
export function isForegroundServiceRunning(): boolean {
  return serviceRunning;
}
