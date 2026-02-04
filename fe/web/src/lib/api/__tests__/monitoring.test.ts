/**
 * Unit Tests: Monitoring API
 * Tests real-time monitoring and statistics endpoints
 */

import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';

describe('Monitoring API', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('GET /monitoring/live-workers', () => {
    it('should fetch live workers data', async () => {
      const mockData = {
        active_workers: 15,
        workers: [
          {
            id: 'worker-1',
            name: 'Worker One',
            area: 'Taman Bungkul',
            status: 'working',
            last_location: {
              lat: -7.289659,
              lng: 112.739208,
              timestamp: '2026-02-04T10:00:00Z',
            },
          },
        ],
      };

      mockAxios.onGet('/monitoring/live-workers').reply(200, mockData);

      const response = await apiClient.get('/monitoring/live-workers');

      expect(response.data.active_workers).toBe(15);
      expect(response.data.workers).toHaveLength(1);
    });

    it('should fetch live workers for specific rayon', async () => {
      mockAxios.onGet(/\/monitoring\/live-workers\?rayon_id=rayon-1/).reply(200, {
        active_workers: 5,
        workers: [],
      });

      const response = await apiClient.get('/monitoring/live-workers?rayon_id=rayon-1');

      expect(response.data.active_workers).toBe(5);
    });
  });

  describe('GET /monitoring/dashboard-stats', () => {
    it('should fetch dashboard statistics', async () => {
      const mockStats = {
        total_workers: 50,
        active_workers: 35,
        total_areas: 120,
        reports_today: 45,
        tasks_pending: 12,
        tasks_in_progress: 8,
        tasks_completed_today: 25,
      };

      mockAxios.onGet('/monitoring/dashboard-stats').reply(200, mockStats);

      const response = await apiClient.get('/monitoring/dashboard-stats');

      expect(response.data.total_workers).toBe(50);
      expect(response.data.active_workers).toBe(35);
      expect(response.data.reports_today).toBe(45);
    });

    it('should fetch dashboard stats with date range', async () => {
      mockAxios.onGet(/\/monitoring\/dashboard-stats\?date=2026-02-04/).reply(200, {
        total_workers: 50,
        active_workers: 30,
      });

      const response = await apiClient.get('/monitoring/dashboard-stats?date=2026-02-04');

      expect(response.data.active_workers).toBe(30);
    });
  });

  describe('GET /monitoring/rayon-stats', () => {
    it('should fetch statistics for all rayons', async () => {
      const mockStats = [
        {
          rayon_id: 'rayon-1',
          rayon_name: 'Rayon Selatan',
          total_areas: 15,
          active_workers: 10,
          reports_today: 8,
        },
        {
          rayon_id: 'rayon-2',
          rayon_name: 'Rayon Utara',
          total_areas: 18,
          active_workers: 12,
          reports_today: 10,
        },
      ];

      mockAxios.onGet('/monitoring/rayon-stats').reply(200, mockStats);

      const response = await apiClient.get('/monitoring/rayon-stats');

      expect(response.data).toHaveLength(2);
      expect(response.data[0].rayon_name).toBe('Rayon Selatan');
    });
  });

  describe('GET /monitoring/worker-activity/:id', () => {
    it('should fetch worker activity history', async () => {
      const mockActivity = {
        worker_id: 'worker-1',
        worker_name: 'Worker One',
        today_reports: 3,
        today_shifts: 1,
        activity_log: [
          {
            timestamp: '2026-02-04T08:00:00Z',
            type: 'clock_in',
            area: 'Taman Bungkul',
          },
          {
            timestamp: '2026-02-04T10:00:00Z',
            type: 'report',
            area: 'Taman Bungkul',
          },
        ],
      };

      mockAxios.onGet('/monitoring/worker-activity/worker-1').reply(200, mockActivity);

      const response = await apiClient.get('/monitoring/worker-activity/worker-1');

      expect(response.data.worker_name).toBe('Worker One');
      expect(response.data.activity_log).toHaveLength(2);
    });

    it('should fetch worker activity for specific date', async () => {
      mockAxios.onGet(/\/monitoring\/worker-activity\/worker-1\?date=2026-02-03/).reply(200, {
        worker_id: 'worker-1',
        today_reports: 2,
        activity_log: [],
      });

      const response = await apiClient.get('/monitoring/worker-activity/worker-1?date=2026-02-03');

      expect(response.data.today_reports).toBe(2);
    });

    it('should handle worker not found', async () => {
      mockAxios.onGet('/monitoring/worker-activity/999').reply(404, {
        statusCode: 404,
        message: 'Worker not found',
        error: 'NotFound',
      });

      await expect(apiClient.get('/monitoring/worker-activity/999')).rejects.toThrow();
    });
  });

  describe('GET /monitoring/area-coverage', () => {
    it('should fetch area coverage statistics', async () => {
      const mockCoverage = {
        total_areas: 120,
        covered_today: 95,
        coverage_percentage: 79.17,
        uncovered_areas: [
          {
            id: 'area-1',
            name: 'Taman XYZ',
            rayon: 'Rayon Selatan',
          },
        ],
      };

      mockAxios.onGet('/monitoring/area-coverage').reply(200, mockCoverage);

      const response = await apiClient.get('/monitoring/area-coverage');

      expect(response.data.total_areas).toBe(120);
      expect(response.data.covered_today).toBe(95);
      expect(response.data.coverage_percentage).toBeCloseTo(79.17);
    });
  });

  describe('GET /monitoring/performance-metrics', () => {
    it('should fetch performance metrics', async () => {
      const mockMetrics = {
        avg_reports_per_worker: 3.2,
        avg_response_time_minutes: 15,
        task_completion_rate: 0.85,
        on_time_clock_in_rate: 0.92,
      };

      mockAxios.onGet('/monitoring/performance-metrics').reply(200, mockMetrics);

      const response = await apiClient.get('/monitoring/performance-metrics');

      expect(response.data.avg_reports_per_worker).toBe(3.2);
      expect(response.data.task_completion_rate).toBe(0.85);
    });
  });
});
