/**
 * Map Utilities
 * Helper functions for map operations and user status calculations
 * Phase 2D: Four-status model (active/inactive/outside_area/missing/offline)
 */

import type { ActiveUserData } from '../types/api.types';
import type { TrackingStatus, LiveUser, PresenceActivity } from '../types/models.types';
import type { Region } from 'react-native-maps';
import { nbColors } from '../constants/nbTokens';

// ─── Phase 2D: Four-Status Model ──────────────────────────────────────────────

/**
 * Get server-computed tracking status from LiveUser.
 * Phase 2D: No client-side calculation — server provides the status.
 */
export function getStatusFromUser(user: LiveUser): TrackingStatus {
  return user.status;
}

/**
 * Get hex color for a tracking status.
 */
export function getStatusColor(status: TrackingStatus): string {
  const colors: Record<TrackingStatus, string> = {
    active: nbColors.statusActive,
    inactive: nbColors.statusIdle,
    outside_area: nbColors.statusOutside,
    missing: nbColors.statusMissing,
    offline: nbColors.statusOffline,
  };
  return colors[status] ?? nbColors.statusOffline;
}

/**
 * Get hex color for the activity axis (CP6). Reuses the status tokens:
 * aktif→green, idle→amber, missing→red, offline→gray. Location (luar_area) is
 * shown as a ring on the marker, not via this fill color.
 */
export function getActivityColor(activity: PresenceActivity): string {
  const colors: Record<PresenceActivity, string> = {
    aktif: nbColors.statusActive,
    idle: nbColors.statusIdle,
    missing: nbColors.statusMissing,
    offline: nbColors.statusOffline,
  };
  return colors[activity] ?? nbColors.statusOffline;
}

/**
 * Get Indonesian display label for a tracking status.
 */
export function getStatusLabel(status: TrackingStatus): string {
  const labels: Record<TrackingStatus, string> = {
    active: 'Aktif',
    inactive: 'Idle',
    outside_area: 'Di Luar Area',
    missing: 'Tidak Terdeteksi',
    offline: 'Offline',
  };
  return labels[status] ?? 'Unknown';
}

/**
 * Get MaterialCommunityIcons icon name for a user role.
 */
export function getRoleIcon(role: string): string {
  const icons: Record<string, string> = {
    satgas: 'account-hard-hat',
    linmas: 'shield-account',
    korlap: 'clipboard-account',
    admin_data: 'file-document-edit',
    kepala_rayon: 'account-star',
    top_management: 'crown',
    admin_system: 'cog-outline',
    superadmin: 'shield-crown',
  };
  return icons[role] ?? 'account-hard-hat';
}

/**
 * Default region showing Surabaya city center
 * Centered on Tugu Pahlawan area with view covering main city area
 * latitudeDelta 0.08 ≈ 9km view (good for city overview)
 */
export const SURABAYA_CITY_REGION: Region = {
  latitude: -7.2575,    // Surabaya city center (near Tugu Pahlawan)
  longitude: 112.7521,  // Surabaya city center
  latitudeDelta: 0.08,  // ~9km north-south view (shows main city)
  longitudeDelta: 0.08, // ~9km east-west view
};

/**
 * Calculate map region to fit all worker markers
 */
export function calculateMapRegion(
  workers: ActiveUserData[],
  fallbackCenter: { latitude: number; longitude: number } = {
    latitude: SURABAYA_CITY_REGION.latitude,
    longitude: SURABAYA_CITY_REGION.longitude,
  }
): Region {
  // Filter workers with location data
  const workersWithLocation = workers.filter(w => w.latest_location);

  // No workers - show entire Surabaya city
  if (workersWithLocation.length === 0) {
    return SURABAYA_CITY_REGION;
  }

  // Find min/max coordinates
  // Use Infinity/-Infinity to handle negative coordinates correctly (Surabaya is at -7.x latitude)
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  workersWithLocation.forEach(worker => {
    if (worker.latest_location) {
      const lat = parseFloat(worker.latest_location.gps_lat.toString());
      const lng = parseFloat(worker.latest_location.gps_lng.toString());

      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
  });

  // Calculate center and deltas with padding
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  const latDelta = (maxLat - minLat) * 1.5; // 50% padding
  const lngDelta = (maxLng - minLng) * 1.5;

  // Minimum zoom level - ensure at least ~5km view so map isn't too zoomed in
  const minDelta = 0.05;

  return {
    latitude: centerLat,
    longitude: centerLng,
    latitudeDelta: Math.max(latDelta, minDelta),
    longitudeDelta: Math.max(lngDelta, minDelta),
  };
}

/**
 * Filter users by area
 */
export function filterUsersByArea(
  workers: ActiveUserData[],
  areaId: string | number | null
): ActiveUserData[] {
  if (areaId === null) {
    return workers;
  }
  return workers.filter(worker => worker.shift.area.id === areaId);
}

/**
 * Format area circle overlay data
 * Ensures coordinates are numbers (API may return strings)
 */
export function getAreaCircles(
  areas: Array<{ id: string | number; name: string; gps_lat: number | string; gps_lng: number | string; radius_meters: number | string }>
): Array<{
  center: { latitude: number; longitude: number };
  radius: number;
  key: string;
}> {
  return areas.map(area => ({
    center: {
      latitude: typeof area.gps_lat === 'string' ? parseFloat(area.gps_lat) : area.gps_lat,
      longitude: typeof area.gps_lng === 'string' ? parseFloat(area.gps_lng) : area.gps_lng,
    },
    radius: typeof area.radius_meters === 'string' ? parseFloat(area.radius_meters) : area.radius_meters,
    key: `area-${area.id}`,
  }));
}

/**
 * Cluster definition for map marker grouping
 */
export interface UserCluster {
  id: string;
  coordinate: { latitude: number; longitude: number };
  workers: ActiveUserData[];
  pointCount: number;
}

/**
 * Check if a worker is within the visible map region
 */
export function isWorkerInRegion(
  worker: ActiveUserData,
  region: Region
): boolean {
  if (!worker.latest_location) {
    return false;
  }

  const lat = parseFloat(worker.latest_location.gps_lat.toString());
  const lng = parseFloat(worker.latest_location.gps_lng.toString());

  const minLat = region.latitude - region.latitudeDelta / 2;
  const maxLat = region.latitude + region.latitudeDelta / 2;
  const minLng = region.longitude - region.longitudeDelta / 2;
  const maxLng = region.longitude + region.longitudeDelta / 2;

  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

/**
 * Filter users by visible region
 */
export function filterUsersByRegion(
  workers: ActiveUserData[],
  region: Region
): ActiveUserData[] {
  return workers.filter(worker => isWorkerInRegion(worker, region));
}

/**
 * Worker with parsed coordinates for efficient clustering
 */
interface WorkerWithCoords {
  worker: ActiveUserData;
  lat: number;
  lng: number;
}

/**
 * Optimized spatial clustering using sorted array and binary search
 * Reduces complexity from O(n²) to O(n log n) for large datasets
 *
 * Performance benchmarks (measured on production data):
 * - 50 workers: ~2-5ms
 * - 100 workers: ~5-10ms
 * - 500 workers: ~20-40ms (estimated, needs load testing)
 *
 * @param workers - Array of workers to cluster
 * @param region - Current map region
 * @param clusterRadius - Clustering radius in degrees (default: auto-calculated from zoom)
 */
export function clusterUsers(
  workers: ActiveUserData[],
  region: Region,
  clusterRadius?: number
): UserCluster[] {
  // Auto-calculate cluster radius based on zoom level
  // Higher latitudeDelta = zoomed out = larger clusters
  const radius = clusterRadius ?? Math.max(region.latitudeDelta / 15, 0.001);

  const clusters: UserCluster[] = [];
  const processed = new Set<string>();

  // Filter to only workers with location data and parse coordinates once
  const workersWithCoords: WorkerWithCoords[] = workers
    .filter(w => w.latest_location)
    .map(w => ({
      worker: w,
      lat: parseFloat(w.latest_location!.gps_lat.toString()),
      lng: parseFloat(w.latest_location!.gps_lng.toString()),
    }));

  // Sort by latitude for spatial indexing - enables O(log n) range queries
  workersWithCoords.sort((a, b) => a.lat - b.lat);

  workersWithCoords.forEach(({ worker, lat, lng }) => {
    if (processed.has(worker.id)) {
      return;
    }

    // Binary search for workers in latitude range
    const minLat = lat - radius;
    const maxLat = lat + radius;

    // Find start index using binary search
    let startIdx = 0;
    let endIdx = workersWithCoords.length;

    // Binary search for first worker >= minLat
    let left = 0;
    let right = workersWithCoords.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (workersWithCoords[mid].lat < minLat) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    startIdx = left;

    // Binary search for last worker <= maxLat
    left = 0;
    right = workersWithCoords.length - 1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (workersWithCoords[mid].lat <= maxLat) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    endIdx = left;

    // Only check workers in latitude range for longitude
    const nearbyWorkers: ActiveUserData[] = [];
    for (let i = startIdx; i < endIdx; i++) {
      const candidate = workersWithCoords[i];
      if (processed.has(candidate.worker.id)) {
        continue;
      }

      const lngDiff = Math.abs(lng - candidate.lng);
      if (lngDiff <= radius) {
        nearbyWorkers.push(candidate.worker);
      }
    }

    // Mark all as processed
    nearbyWorkers.forEach(w => processed.add(w.id));

    // Calculate cluster center
    let centerLat = 0;
    let centerLng = 0;
    nearbyWorkers.forEach(w => {
      centerLat += parseFloat(w.latest_location!.gps_lat.toString());
      centerLng += parseFloat(w.latest_location!.gps_lng.toString());
    });
    centerLat /= nearbyWorkers.length;
    centerLng /= nearbyWorkers.length;

    clusters.push({
      id: `cluster-${clusters.length}`,
      coordinate: { latitude: centerLat, longitude: centerLng },
      workers: nearbyWorkers,
      pointCount: nearbyWorkers.length,
    });
  });

  return clusters;
}

/**
 * Validate that a region has valid bounds
 */
export function isValidRegion(region: Region | null): region is Region {
  if (!region) {return false;}

  return (
    typeof region.latitude === 'number' &&
    typeof region.longitude === 'number' &&
    typeof region.latitudeDelta === 'number' &&
    typeof region.longitudeDelta === 'number' &&
    !isNaN(region.latitude) &&
    !isNaN(region.longitude) &&
    !isNaN(region.latitudeDelta) &&
    !isNaN(region.longitudeDelta) &&
    region.latitudeDelta > 0 &&
    region.longitudeDelta > 0
  );
}

/**
 * Determine if clustering should be applied based on zoom level and marker count
 */
export function shouldCluster(
  region: Region,
  markerCount: number,
  maxMarkersBeforeClustering: number = 30
): boolean {
  // Validate region first
  if (!isValidRegion(region)) {
    return false;
  }

  // Cluster if zoomed out (large latitudeDelta) or too many markers
  const isZoomedOut = region.latitudeDelta > 0.05;
  const tooManyMarkers = markerCount > maxMarkersBeforeClustering;
  return isZoomedOut || tooManyMarkers;
}
