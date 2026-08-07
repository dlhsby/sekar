/**
 * The `integrityViolation` gate.
 *
 * `MockLocationBlocker` mounts a non-dismissable overlay whenever the tracker
 * raises this event, so the event and the dev override have to agree. They did
 * not: `verifiedPosition` honoured `mockLocationAllowed()` and resolved the fix,
 * then the tracker raised a violation on the very same fix — the emulator
 * (whose every fix is mock-provided) was blocked outright with the override on.
 *
 * `../../config/integrity` is mocked rather than the env: `react-native-dotenv`
 * inlines `@env` at BABEL time, so `ALLOW_MOCK_LOCATION` is a compile-time
 * constant no test can vary. The module boundary is the only runtime seam.
 */

import { locationTracker } from '../locationTracker';
import * as locationApi from '../../api/locationApi';
import Geolocation from 'react-native-geolocation-service';
import DeviceInfo from 'react-native-device-info';
import * as permissionService from '../../permissions/permissionService';
import { mockLocationAllowed } from '../../../config/integrity';

jest.mock('react-native-geolocation-service');
jest.mock('react-native-device-info');
jest.mock('../../api/locationApi');
jest.mock('../../sync/offlineQueue');
jest.mock('../../permissions/permissionService');
jest.mock('../../../config/integrity', () => ({
  mockLocationAllowed: jest.fn(),
  galleryUploadAllowed: jest.fn(() => false),
  isOverrideEnabled: jest.fn(() => false),
}));

const allowMock = mockLocationAllowed as jest.Mock;

const mockedFix = {
  coords: {
    latitude: -7.2905,
    longitude: 112.7398,
    accuracy: 10,
    altitude: 0,
    heading: 0,
    speed: 0,
  },
  mocked: true,
  timestamp: Date.now(),
};

const cleanFix = { ...mockedFix, mocked: false };

/** Let captureLocation's battery await + readPosition promise settle. */
const flush = async () => {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
};

beforeEach(() => {
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
  jest.clearAllMocks();
});

describe('LocationTracker integrityViolation', () => {
  it('raises a violation on a mocked fix when the override is off', async () => {
    allowMock.mockReturnValue(false);
    (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) =>
      success(mockedFix),
    );

    const listener = jest.fn();
    locationTracker.on('integrityViolation', listener);

    await locationTracker.initialize('shift-integrity-1');
    await flush();

    expect(listener).toHaveBeenCalledWith('mocked');
  });

  // The bug this suite exists for: an emulator supplies location through a mock
  // provider, so leaving this ungated made the app unusable in development even
  // with ALLOW_MOCK_LOCATION=true.
  it('stays silent on a mocked fix when the override is on', async () => {
    allowMock.mockReturnValue(true);
    (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) =>
      success(mockedFix),
    );

    const listener = jest.fn();
    locationTracker.on('integrityViolation', listener);

    await locationTracker.initialize('shift-integrity-2');
    await flush();

    expect(listener).not.toHaveBeenCalled();
  });

  it('never raises a violation on a clean fix', async () => {
    allowMock.mockReturnValue(false);
    (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) =>
      success(cleanFix),
    );

    const listener = jest.fn();
    locationTracker.on('integrityViolation', listener);

    await locationTracker.initialize('shift-integrity-3');
    await flush();

    expect(listener).not.toHaveBeenCalled();
  });

  // The override relaxes the OVERLAY, never the report. The server applies the
  // real policy, and it can only do that if the ping still says `mocked: true`.
  it('still reports the fix as mocked to the server with the override on', async () => {
    allowMock.mockReturnValue(true);
    (Geolocation.getCurrentPosition as jest.Mock).mockImplementation((success) =>
      success(mockedFix),
    );

    const listener = jest.fn();
    locationTracker.on('locationUpdate', listener);

    await locationTracker.initialize('shift-integrity-4');
    await flush();

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ mocked: true }));
  });
});
