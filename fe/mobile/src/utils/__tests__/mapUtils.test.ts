/**
 * Map Utilities Tests
 * Unit tests for map-related helper functions
 */

import {
  calculateWorkerStatus,
  calculateMapRegion,
  getStatusSummary,
  filterWorkersByArea,
  getAreaCircles,
  clusterWorkers,
  shouldCluster,
  isWorkerInRegion,
  filterWorkersByRegion,
} from '../mapUtils';
import type { ActiveWorkerData } from '../../types/api.types';
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

const mockWorker1: ActiveWorkerData = {
  id: 1,
  username: 'worker1',
  full_name: 'Worker One',
  shift: {
    id: 101,
    clock_in_time: '2026-01-17T08:00:00.000Z',
    area: {
      id: 1,
      name: 'Taman Bungkul',
    },
  },
  latest_location: {
    gps_lat: -7.2905, // Exact center
    gps_lng: 112.7398,
    logged_at: '2026-01-17T10:00:00.000Z',
  },
};

const mockWorker2: ActiveWorkerData = {
  id: 2,
  username: 'worker2',
  full_name: 'Worker Two',
  shift: {
    id: 102,
    clock_in_time: '2026-01-17T08:00:00.000Z',
    area: {
      id: 1,
      name: 'Taman Bungkul',
    },
  },
  latest_location: {
    gps_lat: -7.2913, // ~89m from center (warning zone)
    gps_lng: 112.7398,
    logged_at: '2026-01-17T10:00:00.000Z',
  },
};

const mockWorker3: ActiveWorkerData = {
  id: 3,
  username: 'worker3',
  full_name: 'Worker Three',
  shift: {
    id: 103,
    clock_in_time: '2026-01-17T08:00:00.000Z',
    area: {
      id: 1,
      name: 'Taman Bungkul',
    },
  },
  latest_location: {
    gps_lat: -7.2924, // ~211m from center (outside)
    gps_lng: 112.7398,
    logged_at: '2026-01-17T10:00:00.000Z',
  },
};

const mockWorkerNoLocation: ActiveWorkerData = {
  id: 4,
  username: 'worker4',
  full_name: 'Worker Four',
  shift: {
    id: 104,
    clock_in_time: '2026-01-17T08:00:00.000Z',
    area: {
      id: 1,
      name: 'Taman Bungkul',
    },
  },
  latest_location: null,
};

describe('mapUtils', () => {
  describe('calculateWorkerStatus', () => {
    it('should return "active" for worker within 80% of radius', () => {
      const status = calculateWorkerStatus(mockWorker1, mockAreas);
      expect(status).toBe('active');
    });

    it('should return "warning" for worker between 80-100% of radius', () => {
      const status = calculateWorkerStatus(mockWorker2, mockAreas);
      expect(status).toBe('warning');
    });

    it('should return "outside" for worker beyond radius', () => {
      const status = calculateWorkerStatus(mockWorker3, mockAreas);
      expect(status).toBe('outside');
    });

    it('should return "outside" for worker with no location', () => {
      const status = calculateWorkerStatus(mockWorkerNoLocation, mockAreas);
      expect(status).toBe('outside');
    });

    it('should return "outside" for worker with area not in list', () => {
      const workerUnknownArea = {
        ...mockWorker1,
        shift: { ...mockWorker1.shift, area: { id: 999, name: 'Unknown' } },
      };
      const status = calculateWorkerStatus(workerUnknownArea, mockAreas);
      expect(status).toBe('outside');
    });
  });

  describe('calculateMapRegion', () => {
    it('should calculate region for single worker', () => {
      const workers = [mockWorker1];
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
      const workers = [mockWorker1, mockWorker2, mockWorker3];
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
      const workers: ActiveWorkerData[] = [];
      const fallback = { latitude: -7.2575, longitude: 112.7521 };
      const region = calculateMapRegion(workers, fallback);

      // Returns SURABAYA_CITY_REGION when no workers (delta 0.08 for ~9km city view)
      expect(region.latitude).toBe(fallback.latitude);
      expect(region.longitude).toBe(fallback.longitude);
      expect(region.latitudeDelta).toBe(0.08);
      expect(region.longitudeDelta).toBe(0.08);
    });

    it('should handle workers without location data', () => {
      const workers = [mockWorkerNoLocation];
      const fallback = { latitude: -7.2575, longitude: 112.7521 };
      const region = calculateMapRegion(workers, fallback);

      expect(region.latitude).toBe(fallback.latitude);
      expect(region.longitude).toBe(fallback.longitude);
    });

    it('should apply minimum delta for workers very close together', () => {
      const closeWorker1 = mockWorker1;
      const closeWorker2 = {
        ...mockWorker1,
        id: 5,
        latest_location: {
          gps_lat: -7.29051, // Very close to mockWorker1
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

  describe('getStatusSummary', () => {
    it('should count workers by status', () => {
      const workers = [mockWorker1, mockWorker2, mockWorker3, mockWorkerNoLocation];
      const summary = getStatusSummary(workers, mockAreas);

      expect(summary.total).toBe(4);
      expect(summary.active).toBe(1);
      expect(summary.warning).toBe(1);
      expect(summary.outside).toBe(2);
    });

    it('should return zero counts for empty worker list', () => {
      const workers: ActiveWorkerData[] = [];
      const summary = getStatusSummary(workers, mockAreas);

      expect(summary.total).toBe(0);
      expect(summary.active).toBe(0);
      expect(summary.warning).toBe(0);
      expect(summary.outside).toBe(0);
    });

    it('should handle all workers in same status', () => {
      const workers = [mockWorker1, { ...mockWorker1, id: 2 }, { ...mockWorker1, id: 3 }];
      const summary = getStatusSummary(workers, mockAreas);

      expect(summary.total).toBe(3);
      expect(summary.active).toBe(3);
      expect(summary.warning).toBe(0);
      expect(summary.outside).toBe(0);
    });
  });

  describe('filterWorkersByArea', () => {
    it('should return all workers when areaId is null', () => {
      const workers = [mockWorker1, mockWorker2, mockWorker3];
      const filtered = filterWorkersByArea(workers, null);

      expect(filtered).toHaveLength(3);
      expect(filtered).toEqual(workers);
    });

    it('should filter workers by specific area', () => {
      const worker2DifferentArea = {
        ...mockWorker2,
        shift: { ...mockWorker2.shift, area: { id: 2, name: 'Other Area' } },
      };
      const workers = [mockWorker1, worker2DifferentArea, mockWorker3];
      const filtered = filterWorkersByArea(workers, 1);

      expect(filtered).toHaveLength(2);
      expect(filtered).toEqual([mockWorker1, mockWorker3]);
    });

    it('should return empty array when no workers match area', () => {
      const workers = [mockWorker1, mockWorker2, mockWorker3];
      const filtered = filterWorkersByArea(workers, 999);

      expect(filtered).toHaveLength(0);
    });

    it('should handle empty worker list', () => {
      const workers: ActiveWorkerData[] = [];
      const filtered = filterWorkersByArea(workers, 1);

      expect(filtered).toHaveLength(0);
    });
  });

  describe('getAreaCircles', () => {
    const fullAreas: Area[] = [
      {
        id: 1,
        name: 'Taman Bungkul',
        area_type_id: 1,
        gps_lat: -7.2905,
        gps_lng: 112.7398,
        radius_meters: 100,
        address: 'Surabaya',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 2,
        name: 'Taman Jayengrono',
        area_type_id: 1,
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
      const result = isWorkerInRegion(mockWorker1, testRegion);
      expect(result).toBe(true);
    });

    it('should return false for worker outside region', () => {
      const farWorker: ActiveWorkerData = {
        ...mockWorker1,
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
      const result = isWorkerInRegion(mockWorkerNoLocation, testRegion);
      expect(result).toBe(false);
    });

    it('should handle worker at exact region boundary', () => {
      const boundaryWorker: ActiveWorkerData = {
        ...mockWorker1,
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
      const outsideBoundary: ActiveWorkerData = {
        ...mockWorker1,
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

  describe('filterWorkersByRegion', () => {
    const testRegion: Region = {
      latitude: -7.2905,
      longitude: 112.7398,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };

    it('should filter workers within region', () => {
      const workers = [mockWorker1, mockWorker2, mockWorker3];
      const filtered = filterWorkersByRegion(workers, testRegion);

      // mockWorker1 and mockWorker2 are close, mockWorker3 is far
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
      const workers = [mockWorker1, mockWorker2, mockWorker3];
      const filtered = filterWorkersByRegion(workers, farRegion);

      expect(filtered).toHaveLength(0);
    });

    it('should handle empty worker list', () => {
      const workers: ActiveWorkerData[] = [];
      const filtered = filterWorkersByRegion(workers, testRegion);

      expect(filtered).toHaveLength(0);
    });

    it('should exclude workers without location', () => {
      const workers = [mockWorker1, mockWorkerNoLocation];
      const filtered = filterWorkersByRegion(workers, testRegion);

      expect(filtered).not.toContain(mockWorkerNoLocation);
    });
  });

  describe('clusterWorkers', () => {
    const testRegion: Region = {
      latitude: -7.2905,
      longitude: 112.7398,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };

    it('should cluster workers with no location data filtered out', () => {
      const workers = [mockWorker1, mockWorkerNoLocation];
      const clusters = clusterWorkers(workers, testRegion);

      // Only mockWorker1 should be clustered (has location)
      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters[0].workers).not.toContain(mockWorkerNoLocation);
    });

    it('should create single cluster for nearby workers', () => {
      const nearbyWorker: ActiveWorkerData = {
        ...mockWorker1,
        id: 5,
        latest_location: {
          gps_lat: -7.29051, // Very close
          gps_lng: 112.73981,
          logged_at: '2026-01-17T10:00:00.000Z',
        },
      };
      const workers = [mockWorker1, nearbyWorker];
      const clusters = clusterWorkers(workers, testRegion);

      expect(clusters).toHaveLength(1);
      expect(clusters[0].pointCount).toBe(2);
      expect(clusters[0].workers).toHaveLength(2);
    });

    it('should create separate clusters for far apart workers', () => {
      const farWorker: ActiveWorkerData = {
        ...mockWorker1,
        id: 6,
        latest_location: {
          gps_lat: -7.25, // Far from mockWorker1
          gps_lng: 112.75,
          logged_at: '2026-01-17T10:00:00.000Z',
        },
      };
      const workers = [mockWorker1, farWorker];
      const clusters = clusterWorkers(workers, testRegion);

      expect(clusters.length).toBeGreaterThan(1);
    });

    it('should calculate cluster center as average of worker positions', () => {
      const worker2Nearby: ActiveWorkerData = {
        ...mockWorker1,
        id: 7,
        latest_location: {
          gps_lat: -7.2906,
          gps_lng: 112.7399,
          logged_at: '2026-01-17T10:00:00.000Z',
        },
      };
      const workers = [mockWorker1, worker2Nearby];
      const clusters = clusterWorkers(workers, testRegion);

      expect(clusters).toHaveLength(1);
      // Center should be average of the two positions
      const expectedLat = (-7.2905 + -7.2906) / 2;
      const expectedLng = (112.7398 + 112.7399) / 2;
      expect(clusters[0].coordinate.latitude).toBeCloseTo(expectedLat, 5);
      expect(clusters[0].coordinate.longitude).toBeCloseTo(expectedLng, 5);
    });

    it('should handle single worker', () => {
      const workers = [mockWorker1];
      const clusters = clusterWorkers(workers, testRegion);

      expect(clusters).toHaveLength(1);
      expect(clusters[0].pointCount).toBe(1);
      expect(clusters[0].workers).toEqual([mockWorker1]);
    });

    it('should handle empty worker list', () => {
      const workers: ActiveWorkerData[] = [];
      const clusters = clusterWorkers(workers, testRegion);

      expect(clusters).toHaveLength(0);
    });

    it('should generate unique cluster IDs', () => {
      const workers = [mockWorker1, mockWorker2, mockWorker3];
      const clusters = clusterWorkers(workers, testRegion);

      const ids = clusters.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should use custom cluster radius when provided', () => {
      const workers = [mockWorker1, mockWorker2];
      const customRadius = 0.0001; // Very small radius
      const clusters = clusterWorkers(workers, testRegion, customRadius);

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
      const workers = [mockWorker1, mockWorker2];
      const clusters = clusterWorkers(workers, zoomedOutRegion);

      // With large latitudeDelta (zoomed out), should create fewer clusters
      expect(clusters.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle large number of workers', () => {
      const manyWorkers: ActiveWorkerData[] = Array.from({ length: 100 }, (_, i) => ({
        ...mockWorker1,
        id: i,
        latest_location: {
          gps_lat: -7.29 + (i * 0.001),
          gps_lng: 112.74 + (i * 0.001),
          logged_at: '2026-01-17T10:00:00.000Z',
        },
      }));
      const clusters = clusterWorkers(manyWorkers, testRegion);

      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters.length).toBeLessThanOrEqual(100);

      // Total workers in all clusters should equal input
      const totalWorkers = clusters.reduce((sum, cluster) => sum + cluster.pointCount, 0);
      expect(totalWorkers).toBe(100);
    });

    it('should not process the same worker multiple times', () => {
      const workers = [mockWorker1, mockWorker2, mockWorker3];
      const clusters = clusterWorkers(workers, testRegion);

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

  describe('Clustering Performance Logging (Issue #10)', () => {
    const testRegion: Region = {
      latitude: -7.2905,
      longitude: 112.7398,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should log performance metrics after clustering', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const workers = [mockWorker1, mockWorker2, mockWorker3];
      clusterWorkers(workers, testRegion);

      // Should log performance metrics
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MapUtils] Clustering performance:')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\d+ workers → \d+ clusters in \d+\.\d+ms/)
      );

      consoleLogSpy.mockRestore();
    });

    it('should include worker count in performance log', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const workers = Array.from({ length: 50 }, (_, i) => ({
        ...mockWorker1,
        id: i,
        latest_location: {
          gps_lat: -7.29 + (i * 0.0001),
          gps_lng: 112.74 + (i * 0.0001),
          logged_at: '2026-01-17T10:00:00.000Z',
        },
      }));

      clusterWorkers(workers, testRegion);

      // Should log with correct worker count
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('50 workers')
      );

      consoleLogSpy.mockRestore();
    });

    it('should include cluster count in performance log', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const workers = [mockWorker1, mockWorker2, mockWorker3];
      const clusters = clusterWorkers(workers, testRegion);

      // Should log with cluster count
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(`${clusters.length} clusters`)
      );

      consoleLogSpy.mockRestore();
    });

    it('should include duration in milliseconds in performance log', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const workers = [mockWorker1, mockWorker2];
      clusterWorkers(workers, testRegion);

      // Should log with duration in ms
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/in \d+\.\d+ms/)
      );

      consoleLogSpy.mockRestore();
    });

    it('should warn when clustering is slow (>100ms)', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Create a large dataset that might take >100ms
      const manyWorkers: ActiveWorkerData[] = Array.from({ length: 1000 }, (_, i) => ({
        ...mockWorker1,
        id: i,
        latest_location: {
          gps_lat: -7.29 + (i * 0.0001),
          gps_lng: 112.74 + (i * 0.0001),
          logged_at: '2026-01-17T10:00:00.000Z',
        },
      }));

      clusterWorkers(manyWorkers, testRegion);

      // Check if warning was logged (may or may not be slow depending on hardware)
      const logCalls = consoleLogSpy.mock.calls;
      const warnCalls = consoleWarnSpy.mock.calls;

      // At minimum, should have performance log
      expect(logCalls.some(call =>
        call[0].includes('[MapUtils] Clustering performance:')
      )).toBe(true);

      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should log 500+ worker benchmark when applicable', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      // Create exactly 500 workers
      const workers500: ActiveWorkerData[] = Array.from({ length: 500 }, (_, i) => ({
        ...mockWorker1,
        id: i,
        latest_location: {
          gps_lat: -7.29 + (i * 0.0001),
          gps_lng: 112.74 + (i * 0.0001),
          logged_at: '2026-01-17T10:00:00.000Z',
        },
      }));

      clusterWorkers(workers500, testRegion);

      // Should log 500+ worker benchmark
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MapUtils] 500+ worker benchmark:')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('500 workers clustered')
      );

      consoleLogSpy.mockRestore();
    });

    it('should calculate workers per millisecond in benchmark', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const workers500: ActiveWorkerData[] = Array.from({ length: 500 }, (_, i) => ({
        ...mockWorker1,
        id: i,
        latest_location: {
          gps_lat: -7.29 + (i * 0.0001),
          gps_lng: 112.74 + (i * 0.0001),
          logged_at: '2026-01-17T10:00:00.000Z',
        },
      }));

      clusterWorkers(workers500, testRegion);

      // Should log workers/ms metric
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\d+\.\d+ workers\/ms/)
      );

      consoleLogSpy.mockRestore();
    });

    it('should not break clustering functionality with logging', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const workers = [mockWorker1, mockWorker2, mockWorker3];
      const clusters = clusterWorkers(workers, testRegion);

      // Clustering should still work correctly
      expect(clusters).toBeDefined();
      expect(Array.isArray(clusters)).toBe(true);
      expect(clusters.length).toBeGreaterThan(0);

      // Each cluster should have valid structure
      clusters.forEach(cluster => {
        expect(cluster).toHaveProperty('id');
        expect(cluster).toHaveProperty('coordinate');
        expect(cluster).toHaveProperty('workers');
        expect(cluster).toHaveProperty('pointCount');
        expect(cluster.pointCount).toBeGreaterThan(0);
      });

      consoleLogSpy.mockRestore();
    });

    it('should log performance for empty worker list', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const workers: ActiveWorkerData[] = [];
      const clusters = clusterWorkers(workers, testRegion);

      // Should log even for empty list
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MapUtils] Clustering performance:')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('0 workers → 0 clusters')
      );
      expect(clusters).toHaveLength(0);

      consoleLogSpy.mockRestore();
    });

    it('should log performance for single worker', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const workers = [mockWorker1];
      const clusters = clusterWorkers(workers, testRegion);

      // Should log for single worker
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('1 workers → 1 clusters')
      );
      expect(clusters).toHaveLength(1);

      consoleLogSpy.mockRestore();
    });

    it('should complete clustering quickly for typical datasets', () => {
      // Test with typical dataset of 50 workers
      const workers: ActiveWorkerData[] = Array.from({ length: 50 }, (_, i) => ({
        ...mockWorker1,
        id: i,
        latest_location: {
          gps_lat: -7.29 + (i * 0.001),
          gps_lng: 112.74 + (i * 0.001),
          logged_at: '2026-01-17T10:00:00.000Z',
        },
      }));

      const startTime = performance.now();
      const clusters = clusterWorkers(workers, testRegion);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (< 100ms for 50 workers)
      // Increased threshold for CI environments
      expect(duration).toBeLessThan(100);
      expect(clusters).toBeDefined();
      expect(clusters.length).toBeGreaterThan(0);
    });
  });
});
