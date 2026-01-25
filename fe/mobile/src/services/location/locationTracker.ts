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
 * - LOCATION_DISTANCE_FILTER_METERS (default: 0)
 * - LOCATION_BATCH_UPLOAD_SIZE (default: 20)
 * - LOCATION_MAX_BUFFER_SIZE (default: 100)
 * - GPS_TIMEOUT_SECONDS (default: 10)
 */

import { Alert } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import DeviceInfo from 'react-native-device-info';
import { EventEmitter } from 'events';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadLocationBatch, convertPingsToLocations, type TrackerLocationPing } from '../api/locationApi';
import { addToQueue } from '../sync/offlineQueue';
import { checkLocationPermission, requestLocationPermission } from '../permissions/permissionService';
import config from '../../constants/config';

/**
 * Configuration from centralized config (reads from .env)
 */
const MIN_PING_INTERVAL = config.LOCATION_MIN_INTERVAL_MS;
const MAX_PING_INTERVAL = config.LOCATION_MAX_INTERVAL_MS;
const DISTANCE_FILTER = config.LOCATION_DISTANCE_FILTER;
const BATCH_UPLOAD_SIZE = config.LOCATION_BATCH_SIZE;
const MAX_BUFFER_SIZE = config.LOCATION_MAX_BUFFER_SIZE;
const GPS_TIMEOUT = config.GPS_TIMEOUT_MS;
const GPS_MAXIMUM_AGE = config.GPS_MAXIMUM_AGE_MS;
const HIGH_ACCURACY = true;
const BUFFER_STORAGE_KEY = 'location_buffer';

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
    if (level === -1) return undefined; // Unavailable (emulator)
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
}

/**
 * Location error types for specific handling
 */
export type LocationErrorType =
  | 'permission_denied'
  | 'gps_disabled'
  | 'timeout'
  | 'unknown';

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
}

/**
 * Location Tracker class (Singleton)
 * Only one instance should exist - use the exported `locationTracker` singleton
 */
class LocationTracker extends EventEmitter {
  private shiftId: string | null = null;
  private tracking = false;
  private locationBuffer: LocationPing[] = [];
  private watchId: number | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private instanceId: string;

  constructor() {
    super();
    // Generate unique instance ID for debugging
    this.instanceId = Math.random().toString(36).substring(2, 8);

    if (singletonInitialized) {
      console.warn(`[LocationTracker:${this.instanceId}] WARNING: Multiple instances detected! Use the singleton export.`);
    }
    singletonInitialized = true;

    console.log(`[LocationTracker:${this.instanceId}] Instance created`);
  }

  /**
   * Initialize and start location tracking for a shift
   * Captures location immediately on initialize
   */
  public async initialize(shiftId: string): Promise<void> {
    if (this.tracking) {
      // If already tracking the same shift, just capture a new location
      if (this.shiftId === shiftId) {
        console.log(`[LocationTracker:${this.instanceId}] Already tracking this shift, capturing location`);
        this.captureLocation();
        return;
      }
      // If tracking a different shift, stop first
      console.log(`[LocationTracker:${this.instanceId}] Switching to new shift`);
      await this.stop();
    }

    console.log(`[LocationTracker:${this.instanceId}] Initializing for shift:`, shiftId);

    // Set shiftId FIRST so restored locations can be uploaded
    this.shiftId = shiftId;
    this.tracking = true;

    // Restore buffer from AsyncStorage on app restart (now shiftId is set)
    await this.restoreBuffer();

    // Check location permission
    const hasPermission = await checkLocationPermission();
    if (!hasPermission) {
      console.log(`[LocationTracker:${this.instanceId}] Requesting location permission`);
      const result = await requestLocationPermission();

      if (!result.granted) {
        const errorMsg = 'Izin lokasi ditolak. Tidak dapat memulai pelacakan.';
        console.error(`[LocationTracker:${this.instanceId}]`, errorMsg);
        this.emit('error', errorMsg);
        this.shiftId = null;
        this.tracking = false;

        Alert.alert(
          'Izin Lokasi Diperlukan',
          'Aplikasi memerlukan izin lokasi untuk melacak posisi Anda selama shift. Silakan aktifkan di pengaturan.',
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

    this.emit('trackingStarted', shiftId);
    console.log(`[LocationTracker:${this.instanceId}] Tracking started for shift:`, shiftId);
  }

  /**
   * Stop location tracking
   */
  public async stop(): Promise<void> {
    if (!this.tracking) {
      console.log('[LocationTracker] Not tracking');
      return;
    }

    console.log('[LocationTracker] Stopping tracking...');

    // Stop location watching
    this.stopLocationWatch();

    // Upload remaining locations if any
    if (this.locationBuffer.length > 0) {
      console.log(`[LocationTracker] Uploading ${this.locationBuffer.length} remaining locations`);
      await this.uploadLocations(true); // Force upload all remaining
    }

    // Reset state
    this.shiftId = null;
    this.tracking = false;
    this.locationBuffer = [];

    this.emit('trackingStopped');
    console.log('[LocationTracker] Tracking stopped');
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
      Geolocation.getCurrentPosition(
        (position) => {
          const location: LocationPing = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
            shift_id: shiftId,
            battery_level: batteryLevel,
          };

          console.log('[LocationTracker] Got current location:', {
            lat: location.latitude.toFixed(6),
            lng: location.longitude.toFixed(6),
            accuracy: `${location.accuracy.toFixed(1)}m`,
            battery: batteryLevel !== undefined ? `${batteryLevel}%` : 'N/A',
          });
          resolve(location);
        },
        (error) => {
          const errorMsg = this.handleLocationError(error);
          console.error('[LocationTracker] Error getting current location:', errorMsg);
          reject(new Error(errorMsg));
        },
        {
          enableHighAccuracy: HIGH_ACCURACY,
          timeout: GPS_TIMEOUT,
          maximumAge: GPS_MAXIMUM_AGE,
        }
      );
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
  public captureNow(): void {
    if (this.tracking && this.shiftId) {
      console.log('[LocationTracker] Immediate capture triggered');
      this.captureLocation();
    }
  }

  /**
   * Start location watching with randomized interval
   */
  private startLocationWatch(): void {
    console.log('[LocationTracker] Starting location watch with randomized interval');

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
    console.log(`[LocationTracker] Next capture in ${Math.round(interval / 1000)}s`);

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
    console.log('[LocationTracker] Stopping location watch');

    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.intervalId !== null) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Capture current location with battery level
   */
  private async captureLocation(): Promise<void> {
    if (!this.shiftId || !this.tracking) {
      console.log('[LocationTracker] Not tracking, skipping capture');
      return;
    }

    console.log('[LocationTracker] Capturing location...');

    // Get battery level first (non-blocking, fast ~1-5ms)
    const batteryLevel = await getBatteryLevel();

    Geolocation.getCurrentPosition(
      (position) => {
        const location: LocationPing = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
          shift_id: this.shiftId!,
          battery_level: batteryLevel,
        };

        console.log('[LocationTracker] Location captured:', {
          lat: location.latitude.toFixed(6),
          lng: location.longitude.toFixed(6),
          accuracy: `${location.accuracy.toFixed(1)}m`,
          battery: batteryLevel !== undefined ? `${batteryLevel}%` : 'N/A',
        });

        this.addLocationToBuffer(location);
        this.emit('locationUpdate', location);

        // Check if should upload batch
        if (this.shouldUploadBatch()) {
          this.uploadLocations();
        }
      },
      (error) => {
        const errorMsg = this.handleLocationError(error);
        console.error('[LocationTracker] Location capture error:', errorMsg);
        this.emit('error', errorMsg);

        // Retry with lower accuracy on timeout
        if (error.code === 3) { // TIMEOUT
          this.retryWithLowerAccuracy();
        }
      },
      {
        enableHighAccuracy: HIGH_ACCURACY,
        timeout: GPS_TIMEOUT,
        maximumAge: GPS_MAXIMUM_AGE,
        forceRequestLocation: true,
        forceLocationManager: false,
        showLocationDialog: true,
      }
    );
  }

  /**
   * Retry location capture with lower accuracy
   */
  private async retryWithLowerAccuracy(): Promise<void> {
    if (!this.shiftId || !this.tracking) {
      return;
    }

    console.log('[LocationTracker] Retrying with lower accuracy...');

    // Get battery level (may have changed since first attempt)
    const batteryLevel = await getBatteryLevel();

    Geolocation.getCurrentPosition(
      (position) => {
        const location: LocationPing = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
          shift_id: this.shiftId!,
          battery_level: batteryLevel,
        };

        console.log('[LocationTracker] Location captured (low accuracy):', {
          lat: location.latitude.toFixed(6),
          lng: location.longitude.toFixed(6),
          accuracy: `${location.accuracy.toFixed(1)}m`,
          battery: batteryLevel !== undefined ? `${batteryLevel}%` : 'N/A',
        });
        this.addLocationToBuffer(location);
        this.emit('locationUpdate', location);
      },
      (error) => {
        const errorMsg = this.handleLocationError(error);
        console.error('[LocationTracker] Retry failed:', errorMsg);
        this.emit('error', errorMsg);
      },
      {
        enableHighAccuracy: false, // Lower accuracy
        timeout: GPS_TIMEOUT * 2, // Longer timeout
        maximumAge: GPS_MAXIMUM_AGE * 2,
      }
    );
  }

  /**
   * Add location to memory buffer with OOM prevention
   */
  private addLocationToBuffer(location: LocationPing): void {
    this.locationBuffer.push(location);
    console.log(`[LocationTracker] Buffer size: ${this.locationBuffer.length}/${MAX_BUFFER_SIZE}`);

    // Warning at 80% capacity
    const warningThreshold = Math.floor(MAX_BUFFER_SIZE * 0.8);
    if (this.locationBuffer.length === warningThreshold) {
      console.warn(`[LocationTracker] Buffer reaching capacity (${warningThreshold}/${MAX_BUFFER_SIZE}), consider uploading soon`);
      this.emit('error', `Buffer lokasi hampir penuh (${warningThreshold}/${MAX_BUFFER_SIZE}). Menunggu koneksi jaringan.`);
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
        const restoredBuffer = JSON.parse(bufferStr) as LocationPing[];

        // Filter: only keep locations for the current shift
        const currentShiftLocations = restoredBuffer.filter(
          loc => loc.shift_id === this.shiftId
        );
        const otherShiftLocations = restoredBuffer.length - currentShiftLocations.length;

        if (otherShiftLocations > 0) {
          console.log(`[LocationTracker:${this.instanceId}] Discarding ${otherShiftLocations} locations from other shifts`);
        }

        this.locationBuffer = currentShiftLocations;
        console.log(`[LocationTracker:${this.instanceId}] Restored ${this.locationBuffer.length} locations for current shift`);

        // Upload restored locations if any (now shiftId is set)
        if (this.locationBuffer.length > 0 && this.shiftId) {
          console.log(`[LocationTracker:${this.instanceId}] Uploading restored locations...`);
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
      console.log('[LocationTracker] No locations to upload');
      return;
    }

    if (!this.shiftId) {
      console.log('[LocationTracker] No shift ID, cannot upload');
      return;
    }

    // Determine how many to upload
    const uploadCount = forceAll ? this.locationBuffer.length : BATCH_UPLOAD_SIZE;
    const locationsToUpload = this.locationBuffer.slice(0, uploadCount);
    const shiftId = this.shiftId;

    console.log(`[LocationTracker] Uploading ${locationsToUpload.length} locations...`);

    try {
      // Convert internal format to API format
      const apiLocations = convertPingsToLocations(locationsToUpload as TrackerLocationPing[]);

      // Try to upload to API
      const result = await uploadLocationBatch(shiftId, apiLocations);

      if (result.error) {
        throw new Error(result.error);
      }

      // Success - remove uploaded locations from buffer
      this.locationBuffer = this.locationBuffer.slice(uploadCount);

      // Update persisted buffer
      await this.persistBuffer();

      console.log(`[LocationTracker] Batch uploaded successfully: ${result.data?.inserted_count || locationsToUpload.length} locations`);
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

        console.log(`[LocationTracker] Batch queued for offline sync: ${locationsToUpload.length} locations`);
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
        message = 'Izin lokasi ditolak. Silakan aktifkan di pengaturan.';
        break;
      case 2: // POSITION_UNAVAILABLE
        errorType = 'gps_disabled';
        message = 'Sinyal GPS tidak tersedia. Periksa apakah layanan lokasi aktif.';
        break;
      case 3: // TIMEOUT
        errorType = 'timeout';
        message = 'GPS timeout. Pastikan Anda berada di area terbuka.';
        break;
      default:
        errorType = 'unknown';
        message = error.message || 'Gagal mendapatkan lokasi. Silakan coba lagi.';
    }

    // Emit specific error event for targeted handling
    this.emit('locationError', errorType, message);

    return message;
  }

  /**
   * Check if location services are enabled
   */
  private async checkLocationServicesEnabled(): Promise<void> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        () => resolve(),
        (error) => {
          if (error.code === 2) { // POSITION_UNAVAILABLE - GPS/location services disabled
            const errorMsg = 'GPS tidak aktif. Silakan aktifkan layanan lokasi untuk melanjutkan.';

            Alert.alert(
              'GPS Tidak Aktif',
              'Aplikasi memerlukan GPS untuk melacak lokasi. Silakan aktifkan GPS di pengaturan perangkat.',
              [{ text: 'OK' }]
            );

            reject(new Error(errorMsg));
          } else {
            resolve(); // Other errors are handled during normal operation
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    });
  }

  /**
   * Force upload buffered locations (useful before stopping)
   */
  public async forceUpload(): Promise<void> {
    if (this.locationBuffer.length === 0) {
      console.log('[LocationTracker] No locations to upload');
      return;
    }

    console.log('[LocationTracker] Force uploading buffered locations');
    await this.uploadLocations(true);
  }

  /**
   * Clear buffer (use with caution)
   */
  public clearBuffer(): void {
    console.log('[LocationTracker] Clearing buffer');
    this.locationBuffer = [];
  }

  /**
   * Cleanup - use for complete teardown
   */
  public cleanup(): void {
    console.log('[LocationTracker] Cleaning up...');

    this.stopLocationWatch();
    this.locationBuffer = [];
    this.shiftId = null;
    this.tracking = false;
    this.removeAllListeners();

    console.log('[LocationTracker] Cleanup complete');
  }
}

// Export singleton instance
export const locationTracker = new LocationTracker();
export default locationTracker;
