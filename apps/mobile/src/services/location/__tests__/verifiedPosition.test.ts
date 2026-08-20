/**
 * Tests for the verified position reader.
 *
 * The property under test is that a mocked fix cannot reach a caller unless the
 * caller explicitly opted in — and that the dev override is inert outside dev.
 */

import Geolocation from 'react-native-geolocation-service';

import {
  readPosition,
  watchPosition,
  MockedLocationError,
} from '../verifiedPosition';
import { mockLocationAllowed } from '../../../config/integrity';

jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
}));

jest.mock('../../../config/integrity', () => ({
  mockLocationAllowed: jest.fn(() => false),
  galleryUploadAllowed: jest.fn(() => false),
}));

const mockedGeolocation = Geolocation as jest.Mocked<typeof Geolocation>;
const mockedAllowed = mockLocationAllowed as jest.MockedFunction<typeof mockLocationAllowed>;

/** Build a GeoPosition as the native module would emit it. */
const buildPosition = (overrides: { mocked?: boolean; accuracy?: number } = {}) => ({
  coords: {
    latitude: -7.2905,
    longitude: 112.7398,
    accuracy: overrides.accuracy ?? 12,
    altitude: null,
    heading: null,
    speed: null,
  },
  timestamp: 1_700_000_000_000,
  ...(overrides.mocked === undefined ? {} : { mocked: overrides.mocked }),
});

/** Drive the success callback of whichever Geolocation function was called. */
const emitPosition = (fn: jest.Mock, position: unknown) => {
  const [onSuccess] = fn.mock.calls[0];
  onSuccess(position);
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedAllowed.mockReturnValue(false);
});

describe('readPosition', () => {
  it('resolves a genuine fix and carries the mock verdict', async () => {
    mockedGeolocation.getCurrentPosition.mockImplementation((onSuccess: any) => {
      onSuccess(buildPosition({ mocked: false }));
    });

    const position = await readPosition();

    expect(position.latitude).toBe(-7.2905);
    expect(position.longitude).toBe(112.7398);
    expect(position.accuracy).toBe(12);
    expect(position.mocked).toBe(false);
    expect(position.capturedAt).toEqual(expect.any(String));
  });

  it('rejects a mocked fix when the override is off', async () => {
    mockedGeolocation.getCurrentPosition.mockImplementation((onSuccess: any) => {
      onSuccess(buildPosition({ mocked: true }));
    });

    await expect(readPosition()).rejects.toBeInstanceOf(MockedLocationError);
  });

  it('resolves a mocked fix when the dev override is on', async () => {
    mockedAllowed.mockReturnValue(true);
    mockedGeolocation.getCurrentPosition.mockImplementation((onSuccess: any) => {
      onSuccess(buildPosition({ mocked: true }));
    });

    await expect(readPosition()).resolves.toMatchObject({ mocked: true });
  });

  it('resolves a mocked fix when the caller opts in, preserving the flag', async () => {
    mockedGeolocation.getCurrentPosition.mockImplementation((onSuccess: any) => {
      onSuccess(buildPosition({ mocked: true }));
    });

    // The tracker relies on this: it records spoofed pings rather than dropping
    // them, so a spoof is distinguishable from being offline.
    await expect(readPosition({ allowMocked: true })).resolves.toMatchObject({
      mocked: true,
    });
  });

  it('treats an absent mocked field as not mocked (iOS)', async () => {
    mockedGeolocation.getCurrentPosition.mockImplementation((onSuccess: any) => {
      onSuccess(buildPosition());
    });

    await expect(readPosition()).resolves.toMatchObject({ mocked: false });
  });

  it('defaults to a fresh fix so a stale cached position cannot be replayed', async () => {
    mockedGeolocation.getCurrentPosition.mockImplementation((onSuccess: any) => {
      onSuccess(buildPosition({ mocked: false }));
    });

    await readPosition();

    const [, , options] = mockedGeolocation.getCurrentPosition.mock.calls[0] as any;
    expect(options.maximumAge).toBe(0);
    expect(options.enableHighAccuracy).toBe(true);
  });

  it('lets a caller override read options without losing the safe defaults', async () => {
    mockedGeolocation.getCurrentPosition.mockImplementation((onSuccess: any) => {
      onSuccess(buildPosition({ mocked: false }));
    });

    await readPosition({ geoOptions: { timeout: 30000 } });

    const [, , options] = mockedGeolocation.getCurrentPosition.mock.calls[0] as any;
    expect(options.timeout).toBe(30000);
    expect(options.maximumAge).toBe(0);
  });

  it('propagates native errors unchanged so error-code handling still works', async () => {
    const geoError = { code: 3, message: 'timeout' };
    mockedGeolocation.getCurrentPosition.mockImplementation((_s: any, onError: any) => {
      onError(geoError);
    });

    await expect(readPosition()).rejects.toEqual(geoError);
  });

  it('reports a missing accuracy as null rather than fabricating one', async () => {
    mockedGeolocation.getCurrentPosition.mockImplementation((onSuccess: any) => {
      const position: any = buildPosition({ mocked: false });
      position.coords.accuracy = undefined;
      onSuccess(position);
    });

    await expect(readPosition()).resolves.toMatchObject({ accuracy: null });
  });
});

describe('watchPosition', () => {
  it('routes a mocked update to onError, never to onPosition', () => {
    mockedGeolocation.watchPosition.mockReturnValue(7);
    const onPosition = jest.fn();
    const onError = jest.fn();

    watchPosition({ onPosition, onError });
    emitPosition(mockedGeolocation.watchPosition as jest.Mock, buildPosition({ mocked: true }));

    expect(onPosition).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.any(MockedLocationError));
  });

  it('delivers a genuine update to onPosition', () => {
    mockedGeolocation.watchPosition.mockReturnValue(7);
    const onPosition = jest.fn();

    watchPosition({ onPosition });
    emitPosition(mockedGeolocation.watchPosition as jest.Mock, buildPosition({ mocked: false }));

    expect(onPosition).toHaveBeenCalledWith(expect.objectContaining({ mocked: false }));
  });

  it('clears the native watch on unsubscribe', () => {
    mockedGeolocation.watchPosition.mockReturnValue(7);

    const unsubscribe = watchPosition({ onPosition: jest.fn() });
    unsubscribe();

    expect(mockedGeolocation.clearWatch).toHaveBeenCalledWith(7);
  });
});

describe('provider selection (fake-GPS on an emulator)', () => {
  const optionsOf = (fn: { mock: { calls: any[][] } }) => fn.mock.calls[0][2];

  it('uses the FUSED provider by default — the production path', () => {
    mockedGeolocation.getCurrentPosition.mockImplementation(() => {});
    void readPosition();
    expect(optionsOf(mockedGeolocation.getCurrentPosition).forceLocationManager).toBe(false);
  });

  it('switches to LocationManager when mocked fixes are allowed', () => {
    // A fake-GPS app writes through the platform LocationManager, and the fused
    // provider does not relay it — so every read ran to its timeout, including
    // the low-accuracy retry. A build that ACCEPTS mocked fixes has to be able
    // to see them.
    mockedAllowed.mockReturnValue(true);
    mockedGeolocation.getCurrentPosition.mockImplementation(() => {});
    void readPosition();
    expect(optionsOf(mockedGeolocation.getCurrentPosition).forceLocationManager).toBe(true);
  });

  it('OVERRIDES a call site that hardcodes the fused provider', () => {
    // Three call sites pass `forceLocationManager: false` explicitly. An
    // override any of them can silently defeat is not an override.
    mockedAllowed.mockReturnValue(true);
    mockedGeolocation.getCurrentPosition.mockImplementation(() => {});
    void readPosition({ geoOptions: { forceLocationManager: false } });
    expect(optionsOf(mockedGeolocation.getCurrentPosition).forceLocationManager).toBe(true);
  });

  it('applies the same rule to the watcher', () => {
    mockedAllowed.mockReturnValue(true);
    mockedGeolocation.watchPosition.mockImplementation(() => 1);
    watchPosition({ onPosition: jest.fn() });
    expect(optionsOf(mockedGeolocation.watchPosition).forceLocationManager).toBe(true);
  });

  it('leaves every other option untouched', () => {
    mockedAllowed.mockReturnValue(true);
    mockedGeolocation.getCurrentPosition.mockImplementation(() => {});
    void readPosition({ geoOptions: { timeout: 4321, maximumAge: 0 } });
    const opts = optionsOf(mockedGeolocation.getCurrentPosition);
    expect(opts.timeout).toBe(4321);
    expect(opts.enableHighAccuracy).toBe(true);
  });
});
