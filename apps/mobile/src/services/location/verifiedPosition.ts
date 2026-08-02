/**
 * Verified position reader
 *
 * The single seam through which the app obtains a GPS fix. Before this module
 * there were ~10 independent `Geolocation.getCurrentPosition` / `watchPosition`
 * call sites, each re-declaring its own options object and none of them looking
 * at `position.mocked`. That shape guarantees drift: one new call site that
 * forgets the check silently reopens the hole.
 *
 * Here a caller cannot obtain coordinates *without* also receiving the mock
 * verdict, because `VerifiedPosition` carries them together. The check is not
 * something a call site opts into — it is a property of the only type you can
 * get a position in.
 *
 * Scope note: this is a client-side control and a determined attacker can patch
 * it out of an APK. Its job is to stop casual fake-GPS apps and to make the
 * `mocked` signal available to the server, which applies the real policy. The
 * backend never trusts this verdict on its own.
 */

import Geolocation, {
  type GeoPosition,
  type GeoError,
} from 'react-native-geolocation-service';

import { mockLocationAllowed } from '../../config/integrity';

/**
 * Option shapes are declared locally rather than imported: the library's
 * `GeoOptions` / `GeoWatchOptions` interfaces are not exported from its module
 * declaration, and the two differ — only the one-shot read accepts
 * `timeout` / `maximumAge`, while the watcher accepts `distanceFilter` /
 * `interval`. Keeping them distinct here stops a read-only option being passed
 * to a watch, where it would be silently ignored.
 */
interface SharedGeoOptions {
  enableHighAccuracy?: boolean;
  distanceFilter?: number;
  showLocationDialog?: boolean;
  forceRequestLocation?: boolean;
  forceLocationManager?: boolean;
}

export interface ReadGeoOptions extends SharedGeoOptions {
  timeout?: number;
  maximumAge?: number;
}

export interface WatchGeoOptions extends SharedGeoOptions {
  interval?: number;
  fastestInterval?: number;
  useSignificantChanges?: boolean;
  showsBackgroundLocationIndicator?: boolean;
}

/**
 * A GPS fix plus everything needed to judge whether to trust it.
 *
 * `mocked` is intentionally not optional: a caller must acknowledge it exists.
 */
export interface VerifiedPosition {
  latitude: number;
  longitude: number;
  /** Metres. `null` when the platform does not report it. */
  accuracy: number | null;
  /** True when the OS reports the fix came from a mock provider. */
  mocked: boolean;
  /** Device clock at capture, ISO 8601. The server clamps and re-checks this. */
  capturedAt: string;
}

/** Raised when a fix is rejected because it came from a mock provider. */
export class MockedLocationError extends Error {
  readonly code = 'GPS_MOCKED';

  constructor() {
    super('Location rejected: reported by a mock provider');
    this.name = 'MockedLocationError';
  }
}

/**
 * `maximumAge: 0` is deliberate and must not be relaxed: a cached fix would
 * answer for where the device *was*, which is exactly the window a spoofer uses
 * after switching a mock location off. Callers may override per-read, but the
 * safe value is the default so that forgetting to think about it is safe.
 */
const DEFAULT_READ_OPTIONS: ReadGeoOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
  forceRequestLocation: true,
  forceLocationManager: false,
  showLocationDialog: true,
};

const DEFAULT_WATCH_OPTIONS: WatchGeoOptions = {
  enableHighAccuracy: true,
  distanceFilter: 0,
  forceRequestLocation: true,
  forceLocationManager: false,
  showLocationDialog: true,
};

/**
 * `position.mocked` is Android-only; iOS does not expose an equivalent and the
 * field is absent there. Treat absent as "not mocked" rather than throwing —
 * on iOS the OS itself makes mock providers far harder to reach, and failing
 * closed would make the app unusable on that platform.
 */
const toVerifiedPosition = (position: GeoPosition): VerifiedPosition => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: position.coords.accuracy ?? null,
  mocked: position.mocked === true,
  capturedAt: new Date().toISOString(),
});

/**
 * Returns the position when acceptable, throws `MockedLocationError` when not.
 */
const enforceMockPolicy = (position: VerifiedPosition): VerifiedPosition => {
  if (position.mocked && !mockLocationAllowed()) {
    throw new MockedLocationError();
  }
  return position;
};

interface MockPolicyOption {
  /**
   * Return mocked fixes instead of throwing, leaving `mocked` for the caller to
   * act on. Used by the tracker, which forwards the flag to the server so a
   * spoofed ping is recorded and excluded from presence rather than silently
   * dropped — a dropped ping is indistinguishable from being offline.
   */
  allowMocked?: boolean;
}

export interface ReadOptions extends MockPolicyOption {
  /** Per-read overrides merged over the safe defaults. */
  geoOptions?: ReadGeoOptions;
}

export interface WatchOptions extends MockPolicyOption {
  geoOptions?: WatchGeoOptions;
}

/**
 * Read the current position once.
 *
 * Rejects with `MockedLocationError` on a mocked fix unless `allowMocked` is
 * set, and with the underlying `GeoError` on permission/timeout failures so
 * existing error-code handling (1..5) keeps working unchanged.
 */
export const readPosition = (options: ReadOptions = {}): Promise<VerifiedPosition> =>
  new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        const verified = toVerifiedPosition(position);
        if (options.allowMocked) {
          resolve(verified);
          return;
        }
        try {
          resolve(enforceMockPolicy(verified));
        } catch (error) {
          reject(error);
        }
      },
      (error: GeoError) => reject(error),
      { ...DEFAULT_READ_OPTIONS, ...options.geoOptions },
    );
  });

export interface WatchHandlers {
  onPosition: (position: VerifiedPosition) => void;
  /** Receives `MockedLocationError` as well as native `GeoError`s. */
  onError?: (error: unknown) => void;
}

/**
 * Subscribe to position updates. Returns an unsubscribe function.
 *
 * A mocked update is routed to `onError` rather than `onPosition` (unless
 * `allowMocked`), so a watcher cannot accidentally treat a spoofed fix as good
 * by ignoring a flag it did not read.
 */
export const watchPosition = (
  handlers: WatchHandlers,
  options: WatchOptions = {},
): (() => void) => {
  const watchId = Geolocation.watchPosition(
    (position) => {
      const verified = toVerifiedPosition(position);
      if (options.allowMocked) {
        handlers.onPosition(verified);
        return;
      }
      try {
        handlers.onPosition(enforceMockPolicy(verified));
      } catch (error) {
        handlers.onError?.(error);
      }
    },
    (error: GeoError) => handlers.onError?.(error),
    { ...DEFAULT_WATCH_OPTIONS, ...options.geoOptions },
  );

  return () => Geolocation.clearWatch(watchId);
};
