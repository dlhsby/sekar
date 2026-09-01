/**
 * Tracker-level thinning integration.
 *
 * Separate suite because `locationTracker.test.ts` deliberately pins
 * LOCATION_DISTANCE_FILTER to 0 — its specs replay one fixture coordinate to
 * exercise buffering and upload mechanics, which the filter would (correctly)
 * discard. This suite is the other half: it proves the filter is actually wired
 * into the capture path, not merely unit-tested in isolation.
 */

import { locationTracker } from '../locationTracker';
import * as locationApi from '../../api/locationApi';
import Geolocation from 'react-native-geolocation-service';
import DeviceInfo from 'react-native-device-info';
import * as permissionService from '../../permissions/permissionService';

jest.mock('react-native-geolocation-service');
jest.mock('react-native-device-info');
jest.mock('../../api/locationApi');
jest.mock('../../sync/offlineQueue');
jest.mock('../../permissions/permissionService');
jest.mock('../../../constants/config', () => {
  const actual = jest.requireActual('../../../constants/config');
  return {
    __esModule: true,
    ...actual,
    default: { ...actual.default, LOCATION_DISTANCE_FILTER: 25 },
  };
});

const HERE = { latitude: -7.2905, longitude: 112.7398 };
/** A fix `metres` north of HERE (1 deg latitude ≈ 111 km). */
const northOf = (metres: number) => ({
  coords: {
    latitude: HERE.latitude + metres / 111_000,
    longitude: HERE.longitude,
    accuracy: 10,
    altitude: 0,
    heading: 0,
    speed: 0,
  },
  timestamp: Date.now(),
});

/** Let captureLocation's battery await + readPosition promise settle. */
const flush = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

beforeEach(async () => {
  jest.useFakeTimers();
  locationTracker.cleanup();
  locationTracker.on('error', jest.fn());
  (permissionService.checkLocationPermission as jest.Mock).mockResolvedValue(true);
  (DeviceInfo.getBatteryLevel as jest.Mock).mockResolvedValue(0.75);
  (locationApi.uploadLocationBatch as jest.Mock).mockResolvedValue({
    data: { inserted_count: 1 },
  });
});

afterEach(() => {
  locationTracker.cleanup();
  locationTracker.removeAllListeners();
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe('LocationTracker stationary thinning', () => {
  it('keeps only the first fix while the worker stands still', async () => {
    // The interval is randomised 10-60s, so 61s drives at least one further
    // capture and often several. All of them are the same spot, so only the
    // very first ping survives — that is the whole point of the filter.
    (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) =>
      success(northOf(0)),
    );

    const listener = jest.fn();
    locationTracker.on('locationUpdate', listener);

    await locationTracker.initialize('shift-thinning-1');
    await flush();
    await jest.advanceTimersByTimeAsync(61 * 1000);
    await flush();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('emits a locationUpdate once the worker actually moves', async () => {
    (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) =>
      success(northOf(0)),
    );
    await locationTracker.initialize('shift-thinning-2');
    await flush();

    const listener = jest.fn();
    locationTracker.on('locationUpdate', listener);

    (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) =>
      success(northOf(200)),
    );
    await jest.advanceTimersByTimeAsync(61 * 1000);
    await flush();

    expect(listener).toHaveBeenCalled();
  });

  it('never thins a mocked fix — that ping is the spoofing evidence', async () => {
    (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) =>
      success(northOf(0)),
    );
    await locationTracker.initialize('shift-thinning-3');
    await flush();

    const listener = jest.fn();
    locationTracker.on('locationUpdate', listener);

    // Same spot — would normally be thinned — but flagged as mock-provided.
    (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) =>
      success({ ...northOf(0), mocked: true }),
    );
    await jest.advanceTimersByTimeAsync(61 * 1000);
    await flush();

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ mocked: true }));
  });
});
