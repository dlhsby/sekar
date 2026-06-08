/**
 * Map Utilities Tests
 * Unit tests for map-related helper functions
 */

import {
  calculateMapRegion,
  filterUsersByArea,
  getAreaCircles,
  clusterUsers,
  shouldCluster,
  isWorkerInRegion,
  filterUsersByRegion,
} from '../mapUtils';
import type { ActiveUserData } from '../../types/api.types';
import type { Area } from '../../types/models.types';
import type { Region } from 'react-native-maps';

// Mock data
const mockAreas: Array<{ id: number; gps_lat: number; gps_lng: number; radius_meters: number }> = [
  {
    id: 1,
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    radius_meters: 100,
  },
  {
    id: 2,
    gps_lat: -7.2575,
    gps_lng: 112.7521,
    radius_meters: 150,
  },
];

const mockUser1: ActiveUserData = {
  id: '1',
  username: 'worker1',
  full_name: 'Worker One',
  shift: {
    id: '101',
    clock_in_time: '2026-01-17T08:00:00.000Z',
    area: {
      id: '1',
      name: 'Taman Bungkul',
    },
  },
  latest_location: {
    gps_lat: -7.2905, // Exact center
    gps_lng: 112.7398,
    logged_at: '2026-01-17T10:00:00.000Z',
  },
};

const mockUser2: ActiveUserData = {
  id: '2',
  username: 'worker2',
  full_name: 'Worker Two',
  shift: {
    id: '102',
    clock_in_time: '2026-01-17T08:00:00.000Z',
    area: {
      id: '1',
      name: 'Taman Bungkul',
    },
  },
  latest_location: {
    gps_lat: -7.2913, // ~89m from center (warning zone)
    gps_lng: 112.7398,
    logged_at: '2026-01-17T10:00:00.000Z',
  },
};

const mockUser3: ActiveUserData = {
  id: '3',
  username: 'worker3',
  full_name: 'Worker Three',
  shift: {
    id: '103',
    clock_in_time: '2026-01-17T08:00:00.000Z',
    area: {
      id: '1',
      name: 'Taman Bungkul',
    },
  },
  latest_location: {
    gps_lat: -7.2924, // ~211m from center (outside)
    gps_lng: 112.7398,
    logged_at: '2026-01-17T10:00:00.000Z',
  },
};

const mockUserNoLocation: ActiveUserData = {
  id: '4',
  username: 'worker4',
  full_name: 'Worker Four',
  shift: {
    id: '104',
    clock_in_time: '2026-01-17T08:00:00.000Z',
    area: {
      id: '1',
      name: 'Taman Bungkul',
    },
  },
  latest_location: null,
};

describe('mapUtils', () => {
  describe('calculateMapRegion', () => {
    it('should calculate region for single worker', () => {
      const workers = [mockUser1];
      const region = calculateMapRegion(workers);

      // Verify region structure
      expect(region).toHaveProperty('latitude');
      expect(region).toHaveProperty('longitude');
      expect(region).toHaveProperty('latitudeDelta');
      expect(region).toHaveProperty('longitudeDelta');

      // Verify deltas are positive numbers
      expect(region.latitudeDelta).toBeGreaterThan(0);
      expect(region.longitudeDelta).toBeGreaterThan(0);
    });

    it('should calculate region for multiple workers', () => {
      const workers = [mockUser1, mockUser2, mockUser3];
      const region = calculateMapRegion(workers);

      // Verify region has proper structure
      expect(region).toHaveProperty('latitude');
      expect(region).toHaveProperty('longitude');
      expect(region).toHaveProperty('latitudeDelta');
      expect(region).toHaveProperty('longitudeDelta');

      // Delta should be greater than minimum (workers are spread out)
      expect(region.latitudeDelta).toBeGreaterThan(0.01);
      expect(region.longitudeDelta).toBeGreaterThanOrEqual(0.01);
    });

    it('should return fallback region when no workers', () => {
      const workers: ActiveUserData[] = [];
      const fallback = { latitude: -7.2575, longitude: 112.7521 };
      const region = calculateMapRegion(workers, fallback);

      // Returns SURABAYA_CITY_REGION when no workers (delta 0.08 for ~9km city view)
      expect(region.latitude).toBe(fallback.latitude);
      expect(region.longitude).toBe(fallback.longitude);
      expect(region.latitudeDelta).toBe(0.08);
      expect(region.longitudeDelta).toBe(0.08);
    });

    it('should handle workers without location data', () => {
      const workers = [mockUserNoLocation];
      const fallback = { latitude: -7.2575, longitude: 112.7521 };
      const region = calculateMapRegion(workers, fallback);

      expect(region.latitude).toBe(fallback.latitude);
      expect(region.longitude).toBe(fallback.longitude);
    });

    it('should apply minimum delta for workers very close together', () => {
      const closeWorker1 = mockUser1;
      const closeWorker2 = {
        ...mockUser1,
        id: '5',
        latest_location: {
          gps_lat: -7.29051, // Very close to mockUser1
          gps_lng: 112.73981,
          logged_at: '2026-01-17T10:00:00.000Z',
        },
      };
      const workers = [closeWorker1, closeWorker2];
      const region = calculateMapRegion(workers);

      // Should have minimum delta
      expect(region.latitudeDelta).toBeGreaterThanOrEqual(0.01);
      expect(region.longitudeDelta).toBeGreaterThanOrEqual(0.01);
    });
  });

  describe('filterUsersByArea', () => {
    it('should return all workers when areaId is null', () => {
      const workers = [mockUser1, mockUser2, mockUser3];
      const filtered = filterUsersByArea(workers, null as any as string);

      expect(filtered).toHaveLength(3);
      expect(filtered).toEqual(workers);
    });

    it('should filter workers by specific area', () => {
      const worker2DifferentArea = {
        ...mockUser2,
        shift: { ...mockUser2.shift, area: { id: '2', name: 'Other Area' } },
      };
      const workers = [mockUser1, worker2DifferentArea, mockUser3];
      const filtered = filterUsersByArea(workers, '1');

      expect(filtered).toHaveLength(2);
      expect(filtered).toEqual([mockUser1, mockUser3]);
    });

    it('should return empty array when no workers match area', () => {
      const workers = [mockUser1, mockUser2, mockUser3];
      const filtered = filterUsersByArea(workers, '999');

      expect(filtered).toHaveLength(0);
    });

    it('should handle empty worker list', () => {
      const workers: ActiveUserData[] = [];
      const filtered = filterUsersByArea(workers, '1');

      expect(filtered).toHaveLength(0);
    });
  });

  describe('getAreaCircles', () => {
    const fullAreas: Area[] = [
      {
        id: '1',
        name: 'Taman Bungkul',
        area_type_id: '1',
        gps_lat: -7.2905,
        gps_lng: 112.7398,
        radius_meters: 100,
        address: 'Surabaya',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: '2',
        name: 'Taman Jayengrono',
        area_type_id: '1',
        gps_lat: -7.2575,
        gps_lng: 112.7521,
        radius_meters: 150,
        address: 'Surabaya',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ];

    it('should format areas as circle overlays', () => {
      const circles = getAreaCircles(fullAreas);

      expect(circles).toHaveLength(2);
      expect(circles[0]).toEqual({
        center: { latitude: -7.2905, longitude: 112.7398 },
        radius: 100,
        key: 'area-1',
      });
      expect(circles[1]).toEqual({
        center: { latitude: -7.2575, longitude: 112.7521 },
        radius: 150,
        key: 'area-2',
      });
    });

    it('should handle empty area list', () => {
      const circles = getAreaCircles([]);
      expect(circles).toHaveLength(0);
    });

    it('should generate unique keys for each area', () => {
      const circles = getAreaCircles(fullAreas);
      const keys = circles.map(c => c.key);
      const uniqueKeys = new Set(keys);

      expect(uniqueKeys.size).toBe(keys.length);
    });
  });

  describe('isWorkerInRegion', () => {
    const testRegion: Region = {
      latitude: -7.2905,
      longitude: 112.7398,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };

    it('should return true for worker within region', () => {
      const result = isWorkerInRegion(mockUser1, testRegion);
      expect(result).toBe(true);
    });

    it('should return false for worker outside region', () => {
      const farWorker: ActiveUserData = {
        ...mockUser1,
        latest_location: {
          gps_lat: -7.5, // Far south
          gps_lng: 112.5, // Far west
          logged_at: '2026-01-17T10:00:00.000Z',
        },
      };
      const result = isWorkerInRegion(farWorker, testRegion);
      expect(result).toBe(false);
    });

    it('should return false for worker without location', () => {
      const result = isWorkerInRegion(mockUserNoLocation, testRegion);
      expect(result).toBe(false);
    });

    it('should handle worker at exact region boundary', () => {
      const boundaryWorker: ActiveUserData = {
        ...mockUser1,
        latest_location: {
          gps_lat: -7.2905 + 0.05, // At edge of latitudeDelta
          gps_lng: 112.7398,
          logged_at: '2026-01-17T10:00:00.000Z',
        },
      };
      const result = isWorkerInRegion(boundaryWorker, testRegion);
      expect(result).toBe(true);
    });

    it('should return false for worker just outside boundary', () => {
      const outsideBoundary: ActiveUserData = {
        ...mockUser1,
        latest_location: {
          gps_lat: -7.2905 + 0.051, // Just outside latitudeDelta
          gps_lng: 112.7398,
          logged_at: '2026-01-17T10:00:00.000Z',
        },
      };
      const result = isWorkerInRegion(outsideBoundary, testRegion);
      expect(result).toBe(false);
    });
  });

  describe('filterUsersByRegion', () => {
    const testRegion: Region = {
      latitude: -7.2905,
      longitude: 112.7398,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };

    it('should filter workers within region', () => {
      const workers = [mockUser1, mockUser2, mockUser3];
      const filtered = filterUsersByRegion(workers, testRegion);

      // mockUser1 and mockUser2 are close, mockUser3 is far
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.length).toBeLessThanOrEqual(workers.length);
    });

    it('should return empty array when no workers in region', () => {
      const farRegion: Region = {
        latitude: -8.0, // Far from test workers
        longitude: 113.0,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      const workers = [mockUser1, mockUser2, mockUser3];
      const filtered = filterUsersByRegion(workers, farRegion);

      expect(filtered).toHaveLength(0);
    });

    it('should handle empty worker list', () => {
      const workers: ActiveUserData[] = [];
      const filtered = filterUsersByRegion(workers, testRegion);

      expect(filtered).toHaveLength(0);
    });

    it('should exclude workers without location', () => {
      const workers = [mockUser1, mockUserNoLocation];
      const filtered = filterUsersByRegion(workers, testRegion);

      expect(filtered).not.toContain(mockUserNoLocation);
    });
  });

  describe('clusterUsers', () => {
    const testRegion: Region = {
      latitude: -7.2905,
      longitude: 112.7398,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };

    it('should cluster workers with no location data filtered out', () => {
      const workers = [mockUser1, mockUserNoLocation];
      const clusters = clusterUsers(workers, testRegion);

      // Only mockUser1 should be clustered (has location)
      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters[0].workers).not.toContain(mockUserNoLocation);
    });

    it('should create single cluster for nearby workers', () => {
      const nearbyWorker: ActiveUserData = {
        ...mockUser1,
        id: '5',
        latest_location: {
          gps_lat: -7.29051, // Very close
          gps_lng: 112.73981,
          logged_at: '2026-01-17T10:00:00.000Z',
        },
      };
      const workers = [mockUser1, nearbyWorker];
      const clusters = clusterUsers(workers, testRegion);

      expect(clusters).toHaveLength(1);
      expect(clusters[0].pointCount).toBe(2);
      expect(clusters[0].workers).toHaveLength(2);
    });

    it('should create separate clusters for far apart workers', () => {
      const farWorker: ActiveUserData = {
        ...mockUser1,
        id: '6',
        latest_location: {
          gps_lat: -7.25, // Far from mockUser1
          gps_lng: 112.75,
          logged_at: '2026-01-17T10:00:00.000Z',
        },
      };
      const workers = [mockUser1, farWorker];
      const clusters = clusterUsers(workers, testRegion);

      expect(clusters.length).toBeGreaterThan(1);
    });

    it('should calculate cluster center as average of worker positions', () => {
      const worker2Nearby: ActiveUserData = {
        ...mockUser1,
        id: '7',
        latest_location: {
          gps_lat: -7.2906,
          gps_lng: 112.7399,
          logged_at: '2026-01-17T10:00:00.000Z',
        },
      };
      const workers = [mockUser1, worker2Nearby];
      const clusters = clusterUsers(workers, testRegion);

      expect(clusters).toHaveLength(1);
      // Center should be average of the two positions
      const expectedLat = (-7.2905 + -7.2906) / 2;
      const expectedLng = (112.7398 + 112.7399) / 2;
      expect(clusters[0].coordinate.latitude).toBeCloseTo(expectedLat, 5);
      expect(clusters[0].coordinate.longitude).toBeCloseTo(expectedLng, 5);
    });

    it('should handle single worker', () => {
      const workers = [mockUser1];
      const clusters = clusterUsers(workers, testRegion);

      expect(clusters).toHaveLength(1);
      expect(clusters[0].pointCount).toBe(1);
      expect(clusters[0].workers).toEqual([mockUser1]);
    });

    it('should handle empty worker list', () => {
      const workers: ActiveUserData[] = [];
      const clusters = clusterUsers(workers, testRegion);

      expect(clusters).toHaveLength(0);
    });

    it('should generate unique cluster IDs', () => {
      const workers = [mockUser1, mockUser2, mockUser3];
      const clusters = clusterUsers(workers, testRegion);

      const ids = clusters.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should use custom cluster radius when provided', () => {
      const workers = [mockUser1, mockUser2];
      const customRadius = 0.0001; // Very small radius
      const clusters = clusterUsers(workers, testRegion, customRadius);

      // With very small radius, workers should be in separate clusters
      expect(clusters.length).toBeGreaterThan(1);
    });

    it('should auto-calculate radius based on zoom level', () => {
      const zoomedOutRegion: Region = {
        latitude: -7.2905,
        longitude: 112.7398,
        latitudeDelta: 1.0, // Zoomed out
        longitudeDelta: 1.0,
      };
      const workers = [mockUser1, mockUser2];
      const clusters = clusterUsers(workers, zoomedOutRegion);

      // With large latitudeDelta (zoomed out), should create fewer clusters
      expect(clusters.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle large number of workers', () => {
      const manyWorkers: ActiveUserData[] = Array.from({ length: 100 }, (_, i) => ({
        ...mockUser1,
        id: String(i),
        latest_location: {
          gps_lat: -7.29 + (i * 0.001),
          gps_lng: 112.74 + (i * 0.001),
          logged_at: '2026-01-17T10:00:00.000Z',
        },
      }));
      const clusters = clusterUsers(manyWorkers, testRegion);

      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters.length).toBeLessThanOrEqual(100);

      // Total workers in all clusters should equal input
      const totalWorkers = clusters.reduce((sum, cluster) => sum + cluster.pointCount, 0);
      expect(totalWorkers).toBe(100);
    });

    it('should not process the same worker multiple times', () => {
      const workers = [mockUser1, mockUser2, mockUser3];
      const clusters = clusterUsers(workers, testRegion);

      // Count total workers across all clusters
      const totalWorkers = clusters.reduce((sum, cluster) => sum + cluster.pointCount, 0);
      expect(totalWorkers).toBe(workers.length);
    });
  });

  describe('shouldCluster', () => {
    it('should return true when zoomed out', () => {
      const zoomedOutRegion: Region = {
        latitude: -7.2905,
        longitude: 112.7398,
        latitudeDelta: 0.1, // > 0.05 threshold
        longitudeDelta: 0.1,
      };
      const result = shouldCluster(zoomedOutRegion, 10);
      expect(result).toBe(true);
    });

    it('should return true when marker count exceeds threshold', () => {
      const zoomedInRegion: Region = {
        latitude: -7.2905,
        longitude: 112.7398,
        latitudeDelta: 0.01, // Zoomed in
        longitudeDelta: 0.01,
      };
      const result = shouldCluster(zoomedInRegion, 50); // > 30 default threshold
      expect(result).toBe(true);
    });

    it('should return false when zoomed in with few markers', () => {
      const zoomedInRegion: Region = {
        latitude: -7.2905,
        longitude: 112.7398,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      const result = shouldCluster(zoomedInRegion, 10);
      expect(result).toBe(false);
    });

    it('should use custom max markers threshold', () => {
      const region: Region = {
        latitude: -7.2905,
        longitude: 112.7398,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      const result = shouldCluster(region, 10, 5); // Custom threshold of 5
      expect(result).toBe(true); // 10 > 5
    });

    it('should return true at exact threshold', () => {
      const region: Region = {
        latitude: -7.2905,
        longitude: 112.7398,
        latitudeDelta: 0.05, // Exactly at threshold
        longitudeDelta: 0.05,
      };
      const result = shouldCluster(region, 30);
      expect(result).toBe(false); // 0.05 is not > 0.05
    });

    it('should return true just above threshold', () => {
      const region: Region = {
        latitude: -7.2905,
        longitude: 112.7398,
        latitudeDelta: 0.051, // Just above threshold
        longitudeDelta: 0.051,
      };
      const result = shouldCluster(region, 10);
      expect(result).toBe(true);
    });

    it('should handle zero markers', () => {
      const region: Region = {
        latitude: -7.2905,
        longitude: 112.7398,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      const result = shouldCluster(region, 0);
      expect(result).toBe(false);
    });

    it('should handle very large marker count', () => {
      const region: Region = {
        latitude: -7.2905,
        longitude: 112.7398,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      const result = shouldCluster(region, 500);
      expect(result).toBe(true);
    });
  });

  describe('Clustering Performance', () => {
    it('should complete clustering quickly for typical datasets', () => {
      const testRegion: Region = {
        latitude: -7.2905,
        longitude: 112.7398,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };

      // Test with typical dataset of 50 workers
      const workers: ActiveUserData[] = Array.from({ length: 50 }, (_, i) => ({
        ...mockUser1,
        id: String(i),
        latest_location: {
          gps_lat: -7.29 + (i * 0.001),
          gps_lng: 112.74 + (i * 0.001),
          logged_at: '2026-01-17T10:00:00.000Z',
        },
      }));

      const startTime = performance.now();
      const clusters = clusterUsers(workers, testRegion);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (< 100ms for 50 workers)
      expect(duration).toBeLessThan(100);
      expect(clusters).toBeDefined();
      expect(clusters.length).toBeGreaterThan(0);
    });
  });
});
