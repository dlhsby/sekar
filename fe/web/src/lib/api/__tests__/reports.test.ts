/**
 * Unit Tests: Reports API
 * Tests report fetching, approval, and rejection operations
 */

import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import type { WorkReport, PaginatedResponse } from '@/types/models';

describe('Reports API', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  const mockReport: WorkReport = {
    id: '1',
    worker_id: 'worker-1',
    shift_id: 'shift-1',
    area_id: 'area-1',
    report_type: 'clock_in',
    content: 'Arrived at Taman Bungkul',
    created_at: '2026-02-04T08:00:00Z',
    photo_url: 'https://s3.amazonaws.com/photo.jpg',
    gps_lat: -7.289659,
    gps_lng: 112.739208,
    verification_status: 'pending',
  };

  describe('GET /reports', () => {
    it('should fetch reports list', async () => {
      const mockResponse: PaginatedResponse<WorkReport> = {
        data: [mockReport],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mockAxios.onGet(/\/reports/).reply(200, mockResponse);

      const response = await apiClient.get<PaginatedResponse<WorkReport>>('/reports');

      expect(response.data.data).toHaveLength(1);
      expect(response.data.data[0].content).toBe('Arrived at Taman Bungkul');
    });

    it('should fetch reports with verification status filter', async () => {
      mockAxios.onGet(/\/reports\?verification_status=approved/).reply(200, {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      const response = await apiClient.get('/reports?verification_status=approved');

      expect(response.status).toBe(200);
    });

    it('should fetch reports with worker filter', async () => {
      mockAxios.onGet(/\/reports\?worker_id=worker-1/).reply(200, {
        data: [mockReport],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const response = await apiClient.get('/reports?worker_id=worker-1');

      expect(response.data.data).toHaveLength(1);
    });

    it('should fetch reports with date range filter', async () => {
      mockAxios
        .onGet(/\/reports\?start_date=2026-02-01&end_date=2026-02-04/)
        .reply(200, {
          data: [mockReport],
          meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
        });

      const response = await apiClient.get(
        '/reports?start_date=2026-02-01&end_date=2026-02-04'
      );

      expect(response.data.data).toHaveLength(1);
    });
  });

  describe('GET /reports/:id', () => {
    it('should fetch single report by ID', async () => {
      mockAxios.onGet('/reports/1').reply(200, mockReport);

      const response = await apiClient.get<WorkReport>('/reports/1');

      expect(response.data.content).toBe('Arrived at Taman Bungkul');
      expect(response.data.verification_status).toBe('pending');
    });

    it('should handle report not found', async () => {
      mockAxios.onGet('/reports/999').reply(404, {
        statusCode: 404,
        message: 'Report not found',
        error: 'NotFound',
      });

      await expect(apiClient.get('/reports/999')).rejects.toThrow();
    });
  });

  describe('POST /reports', () => {
    it('should create new report', async () => {
      const formData = new FormData();
      formData.append('content', 'Starting work');
      formData.append('report_type', 'clock_in');
      formData.append('gps_lat', '-7.289659');
      formData.append('gps_lng', '112.739208');

      mockAxios.onPost('/reports').reply(201, {
        ...mockReport,
        id: '10',
        content: 'Starting work',
      });

      const response = await apiClient.post('/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      expect(response.status).toBe(201);
    });

    it('should handle validation errors', async () => {
      mockAxios.onPost('/reports').reply(400, {
        statusCode: 400,
        message: 'Validation failed',
        errors: {
          report_type: 'Report type is required',
          gps_lat: 'GPS latitude is required',
        },
      });

      await expect(apiClient.post('/reports', {})).rejects.toThrow();
    });
  });

  describe('POST /reports/:id/approve', () => {
    it('should approve report', async () => {
      mockAxios.onPost('/reports/1/approve').reply(200, {
        ...mockReport,
        verification_status: 'approved',
        verified_by_id: 'supervisor-1',
        verified_at: '2026-02-04T09:00:00Z',
      });

      const response = await apiClient.post('/reports/1/approve');

      expect(response.data.verification_status).toBe('approved');
      expect(response.data.verified_at).toBeDefined();
    });

    it('should handle already approved report', async () => {
      mockAxios.onPost('/reports/1/approve').reply(400, {
        statusCode: 400,
        message: 'Report already verified',
        error: 'BadRequest',
      });

      await expect(apiClient.post('/reports/1/approve')).rejects.toThrow();
    });
  });

  describe('POST /reports/:id/reject', () => {
    it('should reject report with reason', async () => {
      const rejectData = {
        rejection_reason: 'Photo is unclear',
      };

      mockAxios.onPost('/reports/1/reject', rejectData).reply(200, {
        ...mockReport,
        verification_status: 'rejected',
        verified_by_id: 'supervisor-1',
        verified_at: '2026-02-04T09:00:00Z',
        rejection_reason: 'Photo is unclear',
      });

      const response = await apiClient.post('/reports/1/reject', rejectData);

      expect(response.data.verification_status).toBe('rejected');
      expect(response.data.rejection_reason).toBe('Photo is unclear');
    });

    it('should require rejection reason', async () => {
      mockAxios.onPost('/reports/1/reject').reply(400, {
        statusCode: 400,
        message: 'Rejection reason is required',
        error: 'BadRequest',
      });

      await expect(apiClient.post('/reports/1/reject', {})).rejects.toThrow();
    });
  });

  describe('GET /reports/statistics', () => {
    it('should fetch report statistics', async () => {
      const mockStats = {
        total: 100,
        pending: 25,
        approved: 60,
        rejected: 15,
        by_type: {
          clock_in: 30,
          clock_out: 30,
          work_progress: 40,
        },
      };

      mockAxios.onGet('/reports/statistics').reply(200, mockStats);

      const response = await apiClient.get('/reports/statistics');

      expect(response.data.total).toBe(100);
      expect(response.data.pending).toBe(25);
    });
  });
});
