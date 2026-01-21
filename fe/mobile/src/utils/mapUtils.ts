/**
 * Map Utilities
 * Helper functions for map operations and worker status calculations
 */

import { calculateDistance } from './gpsUtils';
import type { ActiveWorkerData } from '../types/api.types';
import type { WorkerStatus } from '../components/supervisor/WorkerMarker';
import type { Region } from 'react-native-maps';

/**
 * Calculate worker status based on distance from area center
 * - Active (green): Within 80% of radius
 * - Warning (yellow): 80%-100% of radius
 * - Outside (red): Beyond radius
 */
export function calculateWorkerStatus(
  worker: ActiveWorkerData,
  areas: Array<{ id: number; gps_lat: number; gps_lng: number; radius_meters: number }>
): WorkerStatus {
  if (!worker.latest_location) {
    return 'outside';
  }

  // Find worker's assigned area
  const area = areas.find(a => a.id === worker.shift.area.id);
  if (!area) {
    return 'outside';
  }

  // Calculate distance from area center
  const distance = calculateDistance(
    parseFloat(worker.latest_location.gps_lat.toString()),
    parseFloat(worker.latest_location.gps_lng.toString()),
    area.gps_lat,
    area.gps_lng
  );

  // Determine status based on distance thresholds
  const warningThreshold = area.radius_meters * 0.8;

  if (distance <= warningThreshold) {
    return 'active';
  }

  if (distance <= area.radius_meters) {
    return 'warning';
  }

  return 'outside';
}

/**
 * Calculate map region to fit all worker markers
 */
export function calculateMapRegion(
  workers: ActiveWorkerData[],
  fallbackCenter: { latitude: number; longitude: number } = {
    latitude: -7.2575, // Surabaya center
    longitude: 112.7521,
  }
): Region {
  // Filter workers with location data
  const workersWithLocation = workers.filter(w => w.latest_location);

  if (workersWithLocation.length === 0) {
    return {
      ...fallbackCenter,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  }

  // Find min/max coordinates
  let minLat = Number.MAX_VALUE;
  let maxLat = Number.MIN_VALUE;
  let minLng = Number.MAX_VALUE;
  let maxLng = Number.MIN_VALUE;

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

  // Minimum zoom level
  const minDelta = 0.01;

  return {
    latitude: centerLat,
    longitude: centerLng,
    latitudeDelta: Math.max(latDelta, minDelta),
    longitudeDelta: Math.max(lngDelta, minDelta),
  };
}

/**
 * Get status summary counts
 */
export function getStatusSummary(
  workers: ActiveWorkerData[],
  areas: Array<{ id: number; gps_lat: number; gps_lng: number; radius_meters: number }>
): {
  total: number;
  active: number;
  warning: number;
  outside: number;
} {
  const summary = {
    total: workers.length,
    active: 0,
    warning: 0,
    outside: 0,
  };

  workers.forEach(worker => {
    const status = calculateWorkerStatus(worker, areas);
    summary[status]++;
  });

  return summary;
}

/**
 * Filter workers by area
 */
export function filterWorkersByArea(
  workers: ActiveWorkerData[],
  areaId: number | null
): ActiveWorkerData[] {
  if (areaId === null) {
    return workers;
  }
  return workers.filter(worker => worker.shift.area.id === areaId);
}

/**
 * Format area circle overlay data
 */
export function getAreaCircles(
  areas: Array<{ id: number; name: string; gps_lat: number; gps_lng: number; radius_meters: number }>
): Array<{
  center: { latitude: number; longitude: number };
  radius: number;
  key: string;
}> {
  return areas.map(area => ({
    center: {
      latitude: area.gps_lat,
      longitude: area.gps_lng,
    },
    radius: area.radius_meters,
    key: `area-${area.id}`,
  }));
}
