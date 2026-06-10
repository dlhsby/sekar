/**
 * Foreground service tests (4-V Gap 3).
 * Notifee is mocked globally in jest.setup.js; Platform.OS defaults to
 * 'android' under react-native jest preset unless overridden per test.
 */
import { Platform } from 'react-native';
import notifee from '@notifee/react-native';
import {
  startLocationForegroundService,
  stopLocationForegroundService,
  isForegroundServiceRunning,
} from '../foregroundService';

const mockNotifee = notifee as jest.Mocked<typeof notifee>;

describe('foregroundService', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
  });

  afterEach(async () => {
    // Reset module state between tests
    await stopLocationForegroundService();
    Platform.OS = originalOS;
  });

  it('starts a foreground-service notification on a silent channel', async () => {
    await startLocationForegroundService();

    expect(mockNotifee.registerForegroundService).toHaveBeenCalledTimes(1);
    expect(mockNotifee.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'location-tracking' }),
    );
    expect(mockNotifee.displayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        android: expect.objectContaining({
          asForegroundService: true,
          ongoing: true,
          channelId: 'location-tracking',
        }),
      }),
    );
    expect(isForegroundServiceRunning()).toBe(true);
  });

  it('is idempotent — a second start does not display twice', async () => {
    await startLocationForegroundService();
    await startLocationForegroundService();

    expect(mockNotifee.displayNotification).toHaveBeenCalledTimes(1);
  });

  it('stops the service and clears the notification', async () => {
    await startLocationForegroundService();
    await stopLocationForegroundService();

    expect(mockNotifee.stopForegroundService).toHaveBeenCalledTimes(1);
    expect(mockNotifee.cancelNotification).toHaveBeenCalledWith('sekar-location-tracking');
    expect(isForegroundServiceRunning()).toBe(false);
  });

  it('stop is a no-op when not running', async () => {
    await stopLocationForegroundService();
    expect(mockNotifee.stopForegroundService).not.toHaveBeenCalled();
  });

  it('does nothing on iOS', async () => {
    Platform.OS = 'ios';
    await startLocationForegroundService();

    expect(mockNotifee.displayNotification).not.toHaveBeenCalled();
    expect(isForegroundServiceRunning()).toBe(false);
  });

  it('does not throw when notifee fails (tracking must continue foregrounded)', async () => {
    mockNotifee.displayNotification.mockRejectedValueOnce(new Error('no permission'));

    await expect(startLocationForegroundService()).resolves.toBeUndefined();
    expect(isForegroundServiceRunning()).toBe(false);
  });
});
