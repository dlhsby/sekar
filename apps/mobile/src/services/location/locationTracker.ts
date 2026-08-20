/**
 * Location Tracker Service
 * Background location tracking service for active shifts
 *
 * Features:
 * - Tracks worker location at configurable intervals (default: 10-60 seconds randomized)
 * - Configurable distance filter (default: 0 = tracks even when stationary)
 * - Batch uploads (configurable batch size, default: 20)
 * - Offline support with queue management
 * - High accuracy GPS with timeout handling
 * - Memory leak prevention with singleton pattern
 * - Immediate capture on initialize and network reconnect
 *
 * Configuration via .env:
 * - LOCATION_MIN_INTERVAL_SECONDS (default: 10)
 * - LOCATION_MAX_INTERVAL_SECONDS (default: 60)
 * - LOCATION_DISTANCE_FILTER_METERS (default: 0 = off; >0 thins stationary pings)
 * - LOCATION_BATCH_UPLOAD_SIZE (default: 20)
 * - LOCATION_MAX_BUFFER_SIZE (default: 100)
 * - GPS_TIMEOUT_SECONDS (default: 10)
 */

import { Alert } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { readPosition, type VerifiedPosition } from './verifiedPosition';
import { mockLocationAllowed } from '../../config/integrity';
import type { LocationErrorType } from './locationErrors';
import { shouldSkipStationaryPing, type ThinningReference } from './pingThinning';
import { EventEmitter } from 'events';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadLocationBatch, convertPingsToLocations, type TrackerLocationPing } from '../api/locationApi';
import { addToQueue } from '../sync/offlineQueue';
import { checkLocationPermission, requestLocationPermission } from '../permissions/permissionService';
import {
  startLocationForegroundService,
  stopLocationForegroundService,
} from './foregroundService';
import config from '../../constants/config';
import i18n from '../../i18n/config';

/**
 * Configuration from centralized config (reads from .env)
 */
const MIN_PING_INTERVAL = config.LOCATION_MIN_INTERVAL_MS;
const MAX_PING_INTERVAL = config.LOCATION_MAX_INTERVAL_MS;
const BATCH_UPLOAD_SIZE = config.LOCATION_BATCH_SIZE;
const MAX_BUFFER_SIZE = config.LOCATION_MAX_BUFFER_SIZE;
const GPS_TIMEOUT = config.GPS_TIMEOUT_MS;
const GPS_MAXIMUM_AGE = config.GPS_MAXIMUM_AGE_MS;
const HIGH_ACCURACY = true;
// 0 disables client-side thinning (historical behaviour); see pingThinning.ts.
const DISTANCE_FILTER_M = config.LOCATION_DISTANCE_FILTER;
const BUFFER_STORAGE_KEY = 'location_buffer';

/** Standard capture options for the shift-long ping loop. */
const TRACKER_GEO_OPTIONS = {
  enableHighAccuracy: HIGH_ACCURACY,
  timeout: GPS_TIMEOUT,
  maximumAge: GPS_MAXIMUM_AGE,
} as const;

/** Fallback after a timeout: lower accuracy, longer patience. */
const TRACKER_RETRY_GEO_OPTIONS = {
  enableHighAccuracy: false,
  timeout: GPS_TIMEOUT * 2,
  maximumAge: GPS_MAXIMUM_AGE * 2,
} as const;

// Track if singleton has been initialized to prevent duplicates
let singletonInitialized = false;

/**
 * Get random interval between min and max
 */
function getRandomInterval(): number {
  return MIN_PING_INTERVAL + Math.random() * (MAX_PING_INTERVAL - MIN_PING_INTERVAL);
}

/**
 * Get battery level as percentage (0-100)
 * Returns undefined if unavailable (e.g., emulator returns -1)
 */
async function getBatteryLevel(): Promise<number | undefined> {
  try {
    const level = await DeviceInfo.getBatteryLevel();
    if (level === -1) {return undefined;} // Unavailable (emulator)
    return Math.round(level * 100);
  } catch (error) {
    console.warn('[LocationTracker] Failed to get battery level:', error);
    return undefined;
  }
}

/**
 * Location ping interface (internal format)
 */
export interface LocationPing {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string; // ISO format
  shift_id: string;
  battery_level?: number; // 0-100 percentage
  /**
   * True when the OS reported the fix came from a mock provider.
   *
   * The tracker records spoofed pings rather than dropping them: a dropped ping
   * is indistinguishable from a worker being offline, so silently discarding it
   * would hide the cheating it is meant to catch. The server decides what to do
   * — it excludes flagged pings from presence rather than trusting this field.
   */
  mocked: boolean;
}

/**
 * Build a ping from a verified fix.
 *
 * Extracted because the same object literal was repeated at three capture sites
 * (normal, low-accuracy retry, on-demand), which is how `mocked` would end up
 * set in two of them and forgotten in the third.
 */
function buildPing(
  position: VerifiedPosition,
  shiftId: string,
  batteryLevel: number | undefined,
): LocationPing {
  return {
    latitude: position.latitude,
    longitude: position.longitude,
    // The server treats a missing accuracy as "unknown"; -1 would read as a
    // real, absurdly precise value, so keep 0 as the neutral local default.
    accuracy: position.accuracy ?? 0,
    timestamp: position.capturedAt,
    shift_id: shiftId,
    battery_level: batteryLevel,
    mocked: position.mocked,
  };
}

/**
 * Re-exported for backwards compatibility with existing importers. The union
 * itself now lives with the shared error describer so the tracker and the
 * screens classify failures identically.
 */
export type { LocationErrorType } from './locationErrors';

/**
 * Location tracker events
 */
export interface LocationTrackerEvents {
  locationUpdate: (location: LocationPing) => void;
  batchUploaded: (count: number) => void;
  batchQueued: (count: number) => void;
  trackingStarted: (shiftId: string) => void;
  trackingStopped: () => void;
  error: (error: string) => void;
  /** Specific error event with error type for targeted handling */
  locationError: (errorType: LocationErrorType, message: string) => void;
  /**
   * A captured fix came from a mock provider.
   *
   * Raised on every offending capture, not just the first, so a listener that
   * mounts late still learns about an ongoing violation without polling.
   */
  integrityViolation: (reason: 'mocked') => void;
}

/**
 * Location Tracker class (Singleton)
 * Only one instance should exist - use the exported `locationTracker` singleton
 */
class LocationTracker extends EventEmitter {
  private shiftId: string | null = null;
  private tracking = false;
  private locationBuffer: LocationPing[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private firstPingUploaded = false;
  private instanceId: string;

  constructor() {
    super();
    // Generate unique instance ID for debugging
    this.instanceId = Math.random().toString(36).substring(2, 8);

    if (singletonInitialized) {
      console.warn(`[LocationTracker:${this.instanceId}] WARNING: Multiple instances detected! Use the singleton export.`);
    }
    singletonInitialized = true;

    // Node.js EventEmitter throws if 'error' is emitted with no listener.
    // Register a default handler so GPS timeout / permission errors don't
    // crash the app when no screen has attached its own listener.
    this.on('error', (msg: string) => {
      if (__DEV__) { console.warn(`[LocationTracker:${this.instanceId}] Unhandled error event:`, msg); }
    });

    console.debug(`[LocationTracker:${this.instanceId}] Instance created`);
  }

  /**
   * Initialize and start location tracking for a shift
   * Captures location immediately on initialize
   */
  public async initialize(shiftId: string): Promise<void> {
    if (this.tracking) {
      // If already tracking the same shift, just capture a new location
      if (this.shiftId === shiftId) {
        console.debug(`[LocationTracker:${this.instanceId}] Already tracking this shift, capturing location`);
        this.captureLocation();
        return;
      }
      // If tracking a different shift, stop first
      console.debug(`[LocationTracker:${this.instanceId}] Switching to new shift`);
      await this.stop();
    }

    console.debug(`[LocationTracker:${this.instanceId}] Initializing for shift:`, shiftId);

    // Set shiftId FIRST so restored locations can be uploaded
    this.shiftId = shiftId;
    this.tracking = true;

    // Restore buffer from AsyncStorage on app restart (now shiftId is set)
    await this.restoreBuffer();

    // Check location permission
    const hasPermission = await checkLocationPermission();
    if (!hasPermission) {
      console.debug(`[LocationTracker:${this.instanceId}] Requesting location permission`);
      const result = await requestLocationPermission();

      if (!result.granted) {
        const errorMsg = i18n.t('location:permission.denied');
        console.error(`[LocationTracker:${this.instanceId}]`, errorMsg);
        this.emit('error', errorMsg);
        this.shiftId = null;
        this.tracking = false;

        Alert.alert(
          i18n.t('location:permission.required'),
          i18n.t('location:permission.requiredMessage'),
          [{ text: 'OK' }]
        );
        return;
      }
    }

    // Check if location services are enabled
    try {
      await this.checkLocationServicesEnabled();
    } catch (error: any) {
      this.emit('error', error.message);
      this.shiftId = null;
      this.tracking = false;
      return;
    }

    // Start location watching with randomized interval
    this.startLocationWatch();

    // Keep the process at foreground priority on Android so the timer loop
    // survives screen-off / app-minimize for the whole shift (4-V Gap 3).
    await startLocationForegroundService();

    this.emit('trackingStarted', shiftId);
    console.debug(`[LocationTracker:${this.instanceId}] Tracking started for shift:`, shiftId);
  }

  /**
   * Stop location tracking with a final upload attempt.
   * Use stop() when the shift may still be active server-side (e.g. app crash recovery).
   * Use stopImmediate() when the caller just ended the shift via API — uploading would
   * race against the completed-shift state and generate a harmless-but-noisy 400 error.
   */
  public async stop(): Promise<void> {
    if (!this.tracking) {
      console.debug('[LocationTracker] Not tracking');
      return;
    }

    console.debug('[LocationTracker] Stopping tracking...');

    // Stop location watching
    this.stopLocationWatch();
    await stopLocationForegroundService();

    // Upload remaining locations if any
    if (this.locationBuffer.length > 0) {
      console.debug(`[LocationTracker] Uploading ${this.locationBuffer.length} remaining locations`);
      await this.uploadLocations(true); // Force upload all remaining
    }

    // Reset state
    this.shiftId = null;
    this.tracking = false;
    this.locationBuffer = [];

    this.emit('trackingStopped');
    console.debug('[LocationTracker] Tracking stopped');
  }

  /**
   * Stop immediately without uploading the remaining buffer.
   * Call this when the shift was just ended via API — the server already
   * knows the shift is complete so any upload would return 400 anyway.
   */
  public stopImmediate(): void {
    if (!this.tracking) {
      console.debug('[LocationTracker] Not tracking (stopImmediate)');
      return;
    }

    console.debug('[LocationTracker] Stopping immediately (no upload)...');
    this.stopLocationWatch();
    stopLocationForegroundService().catch((err) =>
      console.warn('[LocationTracker] Failed to stop foreground service:', err),
    );

    // Clear buffer without uploading — shift is already ended server-side
    this.locationBuffer = [];
    this.shiftId = null;
    this.tracking = false;
    this.firstPingUploaded = false;

    this.emit('trackingStopped');
    console.debug('[LocationTracker] Tracking stopped immediately');
  }

  /**
   * Get current location reading (one-time) with battery level
   */
  public async getCurrentLocation(): Promise<LocationPing> {
    if (!this.shiftId) {
      throw new Error('No active shift');
    }

    // Get battery level first
    const batteryLevel = await getBatteryLevel();
    const shiftId = this.shiftId;

    return new Promise((resolve, reject) => {
      // allowMocked: the tracker flags rather than refuses — see LocationPing.
      // Options are passed explicitly rather than taking the reader's stricter
      // defaults: a shift-long ping loop deliberately accepts a few-seconds-old
      // fix to save battery, where the one-shot punch reads demand a fresh one.
      readPosition({ allowMocked: true, geoOptions: TRACKER_GEO_OPTIONS })
        .then((position) => {
          const location = buildPing(position, shiftId, batteryLevel);

          console.debug('[LocationTracker] Got current location:', {
            lat: location.latitude.toFixed(6),
            lng: location.longitude.toFixed(6),
            accuracy: `${location.accuracy.toFixed(1)}m`,
            mocked: location.mocked,
            battery: batteryLevel !== undefined ? `${batteryLevel}%` : 'N/A',
          });
          resolve(location);
        })
        .catch((error) => {
          const errorMsg = this.handleLocationError(error);
          console.error('[LocationTracker] Error getting current location:', errorMsg);
          reject(new Error(errorMsg));
        });
    });
  }

  /**
   * Check if tracking is active
   */
  public isTracking(): boolean {
    return this.tracking;
  }

  /**
   * Get current shift ID
   */
  public getCurrentShiftId(): string | null {
    return this.shiftId;
  }

  /**
   * Get buffered locations count
   */
  public getBufferCount(): number {
    return this.locationBuffer.length;
  }

  /**
   * Trigger an immediate location capture
   * Use when coming back online or app foregrounded
   */
  public async captureNow(options: { upload?: boolean } = {}): Promise<void> {
    if (!this.tracking || !this.shiftId) return;
    console.debug('[LocationTracker] Immediate capture triggered');
    // AWAITED, and the upload runs after it. Callers used to fire this and then
    // call `forceUpload()` on the next line — which ran while the GPS read was
    // still in flight, found an empty buffer, logged "No locations to upload"
    // and returned. The fresh fix then sat in the buffer until the batch filled,
    // so pressing Refresh did not put the worker on the supervisor's map.
    await this.captureLocation({ force: options.upload === true });
    if (options.upload) await this.forceUpload();
  }

  /**
   * Start location watching with randomized interval
   */
  private startLocationWatch(): void {
    console.debug('[LocationTracker] Starting location watch with randomized interval');

    // Reset first-ping flag for this new tracking session
    this.firstPingUploaded = false;

    // Capture first location immediately
    this.captureLocation();

    // Schedule next capture with random interval
    this.scheduleNextCapture();
  }

  /**
   * Schedule the next location capture with random interval
   */
  private scheduleNextCapture(): void {
    if (!this.tracking) {
      return;
    }

    const interval = getRandomInterval();
    console.debug(`[LocationTracker] Next capture in ${Math.round(interval / 1000)}s`);

    this.intervalId = setTimeout(() => {
      if (this.tracking) {
        this.captureLocation();
        this.scheduleNextCapture(); // Schedule the next one
      }
    }, interval);
  }

  /**
   * Stop location watching
   */
  private stopLocationWatch(): void {
    console.debug('[LocationTracker] Stopping location watch');
    // A new shift must not be thinned against the previous shift's last fix.
    this.lastAcceptedPing = null;

    // No watch to clear: the tracker polls on a setTimeout loop rather than
    // subscribing via watchPosition, so `intervalId` is the only handle.
    if (this.intervalId !== null) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Capture current location with battery level
   */
  private async captureLocation(options: { force?: boolean } = {}): Promise<void> {
    if (!this.shiftId || !this.tracking) {
      console.debug('[LocationTracker] Not tracking, skipping capture');
      return;
    }

    console.debug('[LocationTracker] Capturing location...');

    // Get battery level first (non-blocking, fast ~1-5ms)
    const batteryLevel = await getBatteryLevel();

    const shiftId = this.shiftId;

    // RETURNED, not fire-and-forget: `captureNow` awaits this before uploading,
    // and an un-returned promise would resolve instantly with an empty buffer.
    return readPosition({
      allowMocked: true,
      geoOptions: {
        ...TRACKER_GEO_OPTIONS,
        forceRequestLocation: true,
        forceLocationManager: false,
        showLocationDialog: true,
      },
    })
      .then((position) => {
        const location = buildPing(position, shiftId, batteryLevel);

        console.debug('[LocationTracker] Location captured:', {
          lat: location.latitude.toFixed(6),
          lng: location.longitude.toFixed(6),
          accuracy: `${location.accuracy.toFixed(1)}m`,
          mocked: location.mocked,
          battery: batteryLevel !== undefined ? `${batteryLevel}%` : 'N/A',
        });

        if (!this.addLocationToBuffer(location, options.force)) return;
        this.emit('locationUpdate', location);

        // Upload first ping immediately so supervisor can see worker location right after clock-in.
        // Subsequent pings batch as normal (upload when buffer reaches BATCH_UPLOAD_SIZE).
        if (!this.firstPingUploaded) {
          this.firstPingUploaded = true;
          this.uploadLocations(true);
        } else if (this.shouldUploadBatch()) {
          this.uploadLocations();
        }
      })
      .catch(async (error) => {
        const errorMsg = this.handleLocationError(error);
        console.error('[LocationTracker] Location capture error:', errorMsg);
        this.emit('error', errorMsg);

        // Retry with lower accuracy on timeout
        if (error?.code === 3) { // TIMEOUT
          // The retry inherits `force`: a user-pressed refresh that fell back to
          // the slower read still has to produce a ping, or the fallback path
          // would quietly be the one that does nothing.
          await this.retryWithLowerAccuracy(options.force === true);
        }
      });
  }

  /**
   * Retry location capture with lower accuracy
   */
  private async retryWithLowerAccuracy(force = false): Promise<void> {
    if (!this.shiftId || !this.tracking) {
      return;
    }

    console.debug('[LocationTracker] Retrying with lower accuracy...');

    // Get battery level (may have changed since first attempt)
    const batteryLevel = await getBatteryLevel();

    const shiftId = this.shiftId;

    return readPosition({ allowMocked: true, geoOptions: TRACKER_RETRY_GEO_OPTIONS })
      .then((position) => {
        const location = buildPing(position, shiftId, batteryLevel);

        console.debug('[LocationTracker] Location captured (low accuracy):', {
          lat: location.latitude.toFixed(6),
          lng: location.longitude.toFixed(6),
          accuracy: `${location.accuracy.toFixed(1)}m`,
          mocked: location.mocked,
          battery: batteryLevel !== undefined ? `${batteryLevel}%` : 'N/A',
        });
        if (!this.addLocationToBuffer(location, force)) return;
        this.emit('locationUpdate', location);
      })
      .catch((error) => {
        const errorMsg = this.handleLocationError(error);
        console.error('[LocationTracker] Retry failed:', errorMsg);
        this.emit('error', errorMsg);
      });
  }

  /**
   * Add location to memory buffer with OOM prevention
   */
  /**
   * The last fix accepted into the buffer, kept as the thinning reference.
   *
   * Not read back from `locationBuffer`, because that empties on upload — the
   * reference has to survive a flush or the first ping after every batch would
   * always be kept and the thinning would barely fire.
   */
  private lastAcceptedPing: ThinningReference | null = null;

  /**
   * @param force keep the ping even if the thinning would drop it. Set for an
   *   EXPLICIT user refresh: thinning exists to save data on a loop the worker
   *   did not ask for, and silently discarding the one ping they pressed a
   *   button for is how "Refresh does nothing" happens for a stationary worker.
   * @returns false when the ping was thinned as a redundant "still here" report.
   */
  private addLocationToBuffer(location: LocationPing, force = false): boolean {
    // Skip a redundant "still here" fix before it is ever buffered or uploaded,
    // saving the worker's mobile data. A mocked fix is NEVER thinned: that ping
    // is the evidence of spoofing and the server needs the row.
    if (
      !force &&
      !location.mocked &&
      shouldSkipStationaryPing(
        {
          latitude: location.latitude,
          longitude: location.longitude,
          capturedAtMs: new Date(location.timestamp).getTime(),
        },
        this.lastAcceptedPing,
        DISTANCE_FILTER_M,
      )
    ) {
      console.debug('[LocationTracker] Stationary ping thinned');
      return false;
    }
    this.lastAcceptedPing = {
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: location.timestamp,
    };

    // Single choke point for both continuous capture paths (normal + low-accuracy
    // retry), so a spoofed fix cannot slip through whichever one produced it.
    // The ping is still buffered and uploaded: the server needs the row to tell
    // "faking location" from a phone that is simply off, and it rejects the ping
    // for presence so the worker reads as inactive until they stop.
    // `mockLocationAllowed()` is checked here, not only in the reader: the
    // reader's policy decides whether a mocked fix RESOLVES, this decides
    // whether it raises the blocking overlay. Without the check the dev
    // override let the fix through and then immediately blocked the app on it,
    // so an emulator (whose every fix is mock-provided) was unusable even with
    // ALLOW_MOCK_LOCATION=true. Release builds are unaffected — the flag is
    // constant-folded to false, so this reads exactly as it did before.
    if (location.mocked && !mockLocationAllowed()) {
      this.emit('integrityViolation', 'mocked');
    }

    this.locationBuffer.push(location);
    console.debug(`[LocationTracker] Buffer size: ${this.locationBuffer.length}/${MAX_BUFFER_SIZE}`);

    // Warning at 80% capacity
    const warningThreshold = Math.floor(MAX_BUFFER_SIZE * 0.8);
    if (this.locationBuffer.length === warningThreshold) {
      console.warn(`[LocationTracker] Buffer reaching capacity (${warningThreshold}/${MAX_BUFFER_SIZE}), consider uploading soon`);
      this.emit('error', i18n.t('location:errors.bufferAlmostFull', { threshold: warningThreshold, max: MAX_BUFFER_SIZE }));
    }

    // Force upload if buffer exceeds max size to prevent OOM
    if (this.locationBuffer.length >= MAX_BUFFER_SIZE) {
      console.warn('[LocationTracker] Buffer exceeded max size, forcing upload');
      this.uploadLocations(true); // Force upload all
    }

    // Persist buffer to AsyncStorage for crash recovery
    this.persistBuffer().catch(err =>
      console.error('[LocationTracker] Failed to persist buffer:', err)
    );
    return true;
  }

  /**
   * Persist location buffer to AsyncStorage for crash recovery
   */
  private async persistBuffer(): Promise<void> {
    try {
      await AsyncStorage.setItem(BUFFER_STORAGE_KEY, JSON.stringify(this.locationBuffer));
    } catch (error) {
      console.error('[LocationTracker] Failed to persist buffer:', error);
    }
  }

  /**
   * Restore location buffer from AsyncStorage
   */
  private async restoreBuffer(): Promise<void> {
    try {
      const bufferStr = await AsyncStorage.getItem(BUFFER_STORAGE_KEY);
      if (bufferStr) {
        // A buffer written by a build that predates `mocked` has no such field.
        // Normalise on read so the rest of the tracker can treat it as required:
        // unknown becomes `false`, since flagging every queued ping the first
        // time a worker updates the app would be a mass false positive.
        const restoredBuffer = (JSON.parse(bufferStr) as LocationPing[]).map(
          (loc) => ({ ...loc, mocked: loc.mocked ?? false }),
        );

        // Filter: only keep locations for the current shift
        const currentShiftLocations = restoredBuffer.filter(
          loc => loc.shift_id === this.shiftId
        );
        const otherShiftLocations = restoredBuffer.length - currentShiftLocations.length;

        if (otherShiftLocations > 0) {
          console.debug(`[LocationTracker:${this.instanceId}] Discarding ${otherShiftLocations} locations from other shifts`);
        }

        this.locationBuffer = currentShiftLocations;
        console.debug(`[LocationTracker:${this.instanceId}] Restored ${this.locationBuffer.length} locations for current shift`);

        // Upload restored locations if any (now shiftId is set)
        if (this.locationBuffer.length > 0 && this.shiftId) {
          console.debug(`[LocationTracker:${this.instanceId}] Uploading restored locations...`);
          await this.uploadLocations();
        }

        // Clear the persisted buffer after restore
        await this.clearPersistedBuffer();
      }
    } catch (error) {
      console.error(`[LocationTracker:${this.instanceId}] Failed to restore buffer:`, error);
      this.locationBuffer = [];
    }
  }

  /**
   * Clear persisted buffer from AsyncStorage
   */
  private async clearPersistedBuffer(): Promise<void> {
    try {
      await AsyncStorage.removeItem(BUFFER_STORAGE_KEY);
    } catch (error) {
      console.error('[LocationTracker] Failed to clear persisted buffer:', error);
    }
  }

  /**
   * Check if should upload batch
   */
  private shouldUploadBatch(): boolean {
    return this.locationBuffer.length >= BATCH_UPLOAD_SIZE;
  }

  /**
   * Upload locations to API or queue offline
   * Uses new API format: { shift_id, locations: [{ gps_lat, gps_lng, accuracy_meters, logged_at }] }
   */
  private async uploadLocations(forceAll = false): Promise<void> {
    if (this.locationBuffer.length === 0) {
      console.debug('[LocationTracker] No locations to upload');
      return;
    }

    if (!this.shiftId) {
      console.debug('[LocationTracker] No shift ID, cannot upload');
      return;
    }

    // Determine how many to upload
    const uploadCount = forceAll ? this.locationBuffer.length : BATCH_UPLOAD_SIZE;
    const locationsToUpload = this.locationBuffer.slice(0, uploadCount);
    const shiftId = this.shiftId;

    console.debug(`[LocationTracker] Uploading ${locationsToUpload.length} locations...`);

    try {
      // Convert internal format to API format
      const apiLocations = convertPingsToLocations(locationsToUpload as TrackerLocationPing[]);

      // Try to upload to API
      const result = await uploadLocationBatch(shiftId, apiLocations);

      if (result.error) {
        // BAD_REQUEST (completed shift) or NOT_FOUND (shift deleted) — drop locations, don't queue
        if (result.code === 'BAD_REQUEST' || result.code === 'NOT_FOUND') {
          console.warn('[LocationTracker] Shift no longer active, dropping locations:', result.error);
          this.locationBuffer = this.locationBuffer.slice(uploadCount);
          await this.persistBuffer();
          this.emit('batchQueued', 0);
          return;
        }
        throw new Error(result.error);
      }

      // Success - remove uploaded locations from buffer
      this.locationBuffer = this.locationBuffer.slice(uploadCount);

      // Update persisted buffer
      await this.persistBuffer();

      console.debug(`[LocationTracker] Batch uploaded successfully: ${result.data?.inserted_count || locationsToUpload.length} locations`);
      this.emit('batchUploaded', locationsToUpload.length);
    } catch (error: any) {
      console.error('[LocationTracker] Upload failed, queuing for offline sync:', error.message);

      // Queue for offline sync with new format
      try {
        const queueData = {
          shift_id: shiftId,
          locations: convertPingsToLocations(locationsToUpload as TrackerLocationPing[]),
        };

        await addToQueue('location', queueData);

        // Remove queued locations from buffer
        this.locationBuffer = this.locationBuffer.slice(uploadCount);

        // Update persisted buffer
        await this.persistBuffer();

        console.debug(`[LocationTracker] Batch queued for offline sync: ${locationsToUpload.length} locations`);
        this.emit('batchQueued', locationsToUpload.length);
      } catch (queueError: any) {
        console.error('[LocationTracker] Failed to queue locations:', queueError.message);
        this.emit('error', `Failed to save locations: ${queueError.message}`);
      }
    }
  }

  /**
   * Handle location errors
   * Note: @react-native-community/geolocation uses standard error codes:
   * 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
   */
  private handleLocationError(error: any): string {
    let errorType: LocationErrorType;
    let message: string;

    switch (error.code) {
      case 1: // PERMISSION_DENIED
        errorType = 'permission_denied';
        message = i18n.t('location:errors.permissionDenied');
        break;
      case 2: // POSITION_UNAVAILABLE
        errorType = 'gps_disabled';
        message = i18n.t('location:errors.positionUnavailable');
        break;
      case 3: // TIMEOUT
        errorType = 'timeout';
        message = i18n.t('location:errors.timeout');
        break;
      default:
        errorType = 'unknown';
        message = error.message || i18n.t('location:errors.unknown');
    }

    // Emit specific error event for targeted handling
    this.emit('locationError', errorType, message);

    return message;
  }

  /**
   * Check if location services are enabled
   */
  private async checkLocationServicesEnabled(): Promise<void> {
    // allowMocked: this asks whether the provider answers at all, not whether
    // the fix can be trusted. A mocked fix still proves location services are on.
    return readPosition({
      allowMocked: true,
      geoOptions: { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 },
    }).then(
      () => undefined,
      (error) => {
        if (error?.code !== 2) {
          return; // POSITION_UNAVAILABLE is the only fatal case; others are
          //         handled during normal operation.
        }
        Alert.alert(
          i18n.t('location:errors.gpsDisabledTitle'),
          i18n.t('location:errors.gpsDisabledMessage'),
          [{ text: 'OK' }],
        );
        throw new Error(i18n.t('location:errors.gpsDisabled'));
      },
    );
  }

  /**
   * Force upload buffered locations (useful before stopping)
   */
  public async forceUpload(): Promise<void> {
    if (this.locationBuffer.length === 0) {
      console.debug('[LocationTracker] No locations to upload');
      return;
    }

    console.debug('[LocationTracker] Force uploading buffered locations');
    await this.uploadLocations(true);
  }

  /**
   * Clear buffer (use with caution)
   */
  public clearBuffer(): void {
    console.debug('[LocationTracker] Clearing buffer');
    this.locationBuffer = [];
  }

  /**
   * Cleanup - use for complete teardown
   */
  public cleanup(): void {
    console.debug('[LocationTracker] Cleaning up...');

    this.stopLocationWatch();
    stopLocationForegroundService().catch((err) =>
      console.warn('[LocationTracker] Failed to stop foreground service:', err),
    );
    this.locationBuffer = [];
    this.shiftId = null;
    this.tracking = false;
    this.firstPingUploaded = false;
    this.removeAllListeners();

    console.debug('[LocationTracker] Cleanup complete');
  }
}

// Export singleton instance
export const locationTracker = new LocationTracker();
export default locationTracker;
