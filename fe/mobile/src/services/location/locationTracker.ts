/**
 * Location Tracker Service
 * Background location tracking service for active shifts
 *
 * Features:
 * - Tracks worker location every 5-10 minutes (randomized) during active shifts
 * - Battery optimized with 50m distance filter
 * - Batch uploads (max 20 locations per request)
 * - Offline support with queue management
 * - High accuracy GPS with timeout handling
 * - Memory leak prevention
 * - Immediate capture on initialize and network reconnect
 */

import { Platform, Alert } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { EventEmitter } from 'events';
import { uploadLocationBatch, convertPingsToLocations, type TrackerLocationPing } from '../api/locationApi';
import { addToQueue } from '../sync/offlineQueue';
import { checkLocationPermission, requestLocationPermission } from '../permissions/permissionService';

/**
 * Configuration constants
 */
const MIN_PING_INTERVAL = 5 * 60 * 1000; // 5 minutes minimum
const MAX_PING_INTERVAL = 10 * 60 * 1000; // 10 minutes maximum
const DISTANCE_FILTER = 50; // 50 meters
const BATCH_UPLOAD_SIZE = 20; // Max 20 locations per batch
const GPS_TIMEOUT = 10000; // 10 seconds
const GPS_MAXIMUM_AGE = 5000; // 5 seconds
const HIGH_ACCURACY = true;

/**
 * Get random interval between min and max
 */
function getRandomInterval(): number {
  return MIN_PING_INTERVAL + Math.random() * (MAX_PING_INTERVAL - MIN_PING_INTERVAL);
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
}

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
}

/**
 * Location Tracker class (Singleton)
 */
class LocationTracker extends EventEmitter {
  private shiftId: string | null = null;
  private tracking = false;
  private locationBuffer: LocationPing[] = [];
  private watchId: number | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Initialize and start location tracking for a shift
   * Captures location immediately on initialize
   */
  public async initialize(shiftId: string): Promise<void> {
    if (this.tracking) {
      // If already tracking the same shift, just capture a new location
      if (this.shiftId === shiftId) {
        console.log('[LocationTracker] Already tracking this shift, capturing location');
        this.captureLocation();
        return;
      }
      // If tracking a different shift, stop first
      console.log('[LocationTracker] Switching to new shift');
      await this.stop();
    }

    console.log('[LocationTracker] Initializing for shift:', shiftId);

    // Check location permission
    const hasPermission = await checkLocationPermission();
    if (!hasPermission) {
      console.log('[LocationTracker] Requesting location permission');
      const result = await requestLocationPermission();

      if (!result.granted) {
        const errorMsg = 'Location permission denied. Cannot start tracking.';
        console.error('[LocationTracker]', errorMsg);
        this.emit('error', errorMsg);

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
      return;
    }

    this.shiftId = shiftId;
    this.tracking = true;
    this.locationBuffer = [];

    // Start location watching with randomized interval
    this.startLocationWatch();

    this.emit('trackingStarted', shiftId);
    console.log('[LocationTracker] Tracking started for shift:', shiftId);
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
   * Get current location reading (one-time)
   */
  public getCurrentLocation(): Promise<LocationPing> {
    return new Promise((resolve, reject) => {
      if (!this.shiftId) {
        reject(new Error('No active shift'));
        return;
      }

      Geolocation.getCurrentPosition(
        (position) => {
          const location: LocationPing = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
            shift_id: this.shiftId!,
          };

          console.log('[LocationTracker] Got current location:', location);
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
   * Capture current location
   */
  private captureLocation(): void {
    if (!this.shiftId || !this.tracking) {
      console.log('[LocationTracker] Not tracking, skipping capture');
      return;
    }

    console.log('[LocationTracker] Capturing location...');

    Geolocation.getCurrentPosition(
      (position) => {
        const location: LocationPing = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
          shift_id: this.shiftId!,
        };

        console.log('[LocationTracker] Location captured:', {
          lat: location.latitude.toFixed(6),
          lng: location.longitude.toFixed(6),
          accuracy: `${location.accuracy.toFixed(1)}m`,
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
  private retryWithLowerAccuracy(): void {
    if (!this.shiftId || !this.tracking) {
      return;
    }

    console.log('[LocationTracker] Retrying with lower accuracy...');

    Geolocation.getCurrentPosition(
      (position) => {
        const location: LocationPing = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
          shift_id: this.shiftId!,
        };

        console.log('[LocationTracker] Location captured (low accuracy):', location);
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
   * Add location to memory buffer
   */
  private addLocationToBuffer(location: LocationPing): void {
    this.locationBuffer.push(location);
    console.log(`[LocationTracker] Buffer size: ${this.locationBuffer.length}/${BATCH_UPLOAD_SIZE}`);
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
    switch (error.code) {
      case 1: // PERMISSION_DENIED
        return 'Location permission denied. Please enable it in settings.';
      case 2: // POSITION_UNAVAILABLE
        return 'GPS signal unavailable. Please check if location services are enabled.';
      case 3: // TIMEOUT
        return 'GPS timeout. Please ensure you have a clear view of the sky.';
      default:
        return error.message || 'Unknown location error';
    }
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
            const errorMsg = 'GPS is disabled. Please enable location services to continue.';

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
