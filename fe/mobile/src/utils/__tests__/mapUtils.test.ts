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
} from '../mapUtils';
import type { ActiveWorkerData } from '../../types/api.types';
import type { Area } from '../../types/models.types';

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

      expect(region.latitude).toBe(fallback.latitude);
      expect(region.longitude).toBe(fallback.longitude);
      expect(region.latitudeDelta).toBe(0.1);
      expect(region.longitudeDelta).toBe(0.1);
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
});
