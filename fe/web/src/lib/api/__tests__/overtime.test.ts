/**
 * Unit Tests: Overtime API
 * Tests overtime CRUD operations and approval workflow (Phase 2C)
 */

import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import type { PaginatedResponse, Overtime, OvertimeFilters } from '@/types/models';

describe('Overtime API', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  const mockOvertime: Overtime = {
    id: 'overtime-1',
    user_id: 'user-1',
    user: {
      id: 'user-1',
      username: 'satgas1',
      full_name: 'Satgas One',
      role: 'satgas',
    },
    area_id: 'area-1',
    area: {
      id: 'area-1',
      name: 'Taman Bungkul',
    },
    date: '2026-02-16',
    start_time: '17:00:00',
    end_time: '20:00:00',
    status: 'pending',
    activity_type_id: 'type-1',
    activity_type: {
      id: 'type-1',
      code: 'PLANTING',
      name: 'Penanaman',
    },
    description: 'Penanaman pohon tambahan',
    photo_urls: ['photo1.jpg'],
    gps_lat: -7.289383,
    gps_lng: 112.742308,
    created_at: '2026-02-16T08:00:00Z',
  };

  describe('GET /overtime', () => {
    it('should fetch overtime list without filters', async () => {
      const mockResponse: PaginatedResponse<Overtime> = {
        data: [mockOvertime],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mock.onGet('/overtime').reply(200, mockResponse);

      const response = await apiClient.get<PaginatedResponse<Overtime>>('/overtime');

      expect(response.data.data).toHaveLength(1);
      expect(response.data.data[0].status).toBe('pending');
    });

    it('should fetch overtime with status filter', async () => {
      const filters: OvertimeFilters = { status: 'pending' };

      mock.onGet('/overtime', { params: filters }).reply(200, {
        data: [mockOvertime],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const response = await apiClient.get('/overtime', { params: filters });

      expect(response.data.data).toHaveLength(1);
      expect(response.data.data[0].status).toBe('pending');
    });

    it('should fetch overtime with area filter', async () => {
      const filters: OvertimeFilters = { area_id: 'area-1' };

      mock.onGet('/overtime', { params: filters }).reply(200, {
        data: [mockOvertime],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const response = await apiClient.get('/overtime', { params: filters });

      expect(response.data.data[0].area?.name).toBe('Taman Bungkul');
    });

    it('should fetch overtime with date range', async () => {
      const filters: OvertimeFilters = {
        from_date: '2026-02-15',
        to_date: '2026-02-17',
      };

      mock.onGet('/overtime', { params: filters }).reply(200, {
        data: [mockOvertime],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const response = await apiClient.get('/overtime', { params: filters });

      expect(response.data.data).toHaveLength(1);
    });

    it('should handle empty overtime list', async () => {
      mock.onGet('/overtime').reply(200, {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      const response = await apiClient.get<PaginatedResponse<Overtime>>('/overtime');

      expect(response.data.data).toHaveLength(0);
      expect(response.data.meta.total).toBe(0);
    });
  });

  describe('GET /overtime/:id', () => {
    it('should fetch single overtime by ID', async () => {
      mock.onGet('/overtime/overtime-1').reply(200, mockOvertime);

      const response = await apiClient.get<Overtime>('/overtime/overtime-1');

      expect(response.data.id).toBe('overtime-1');
      expect(response.data.date).toBe('2026-02-16');
      expect(response.data.start_time).toBe('17:00:00');
      expect(response.data.end_time).toBe('20:00:00');
    });

    it('should handle overtime not found', async () => {
      mock.onGet('/overtime/nonexistent').reply(404, {
        statusCode: 404,
        message: 'Overtime not found',
        error: 'NotFound',
      });

      await expect(apiClient.get('/overtime/nonexistent')).rejects.toThrow();
    });
  });

  describe('PATCH /overtime/:id/approve', () => {
    it('should approve overtime successfully', async () => {
      const approvedOvertime: Overtime = {
        ...mockOvertime,
        status: 'approved',
        approved_by: 'korlap-1',
        approved_at: '2026-02-16T09:00:00Z',
      };

      mock.onPatch('/overtime/overtime-1/approve').reply(200, approvedOvertime);

      const response = await apiClient.patch<Overtime>('/overtime/overtime-1/approve');

      expect(response.data.status).toBe('approved');
      expect(response.data.approved_by).toBe('korlap-1');
      expect(response.data.approved_at).toBeDefined();
    });

    it('should handle approval error (already approved)', async () => {
      mock.onPatch('/overtime/overtime-1/approve').reply(400, {
        statusCode: 400,
        message: 'Overtime already approved',
        error: 'BadRequest',
      });

      await expect(apiClient.patch('/overtime/overtime-1/approve')).rejects.toThrow();
    });

    it('should handle approval error (forbidden)', async () => {
      mock.onPatch('/overtime/overtime-1/approve').reply(403, {
        statusCode: 403,
        message: 'Only korlap can approve overtime',
        error: 'Forbidden',
      });

      await expect(apiClient.patch('/overtime/overtime-1/approve')).rejects.toThrow();
    });
  });

  describe('PATCH /overtime/:id/reject', () => {
    it('should reject overtime with reason', async () => {
      const rejectionData = { rejection_reason: 'Tidak sesuai prosedur' };
      const rejectedOvertime: Overtime = {
        ...mockOvertime,
        status: 'rejected',
        rejection_reason: 'Tidak sesuai prosedur',
        rejected_by: 'korlap-1',
        rejected_at: '2026-02-16T09:00:00Z',
      };

      mock.onPatch('/overtime/overtime-1/reject', rejectionData).reply(200, rejectedOvertime);

      const response = await apiClient.patch<Overtime>(
        '/overtime/overtime-1/reject',
        rejectionData
      );

      expect(response.data.status).toBe('rejected');
      expect(response.data.rejection_reason).toBe('Tidak sesuai prosedur');
      expect(response.data.rejected_by).toBe('korlap-1');
    });

    it('should handle rejection error (missing reason)', async () => {
      mock.onPatch('/overtime/overtime-1/reject').reply(400, {
        statusCode: 400,
        message: 'Rejection reason is required',
        error: 'BadRequest',
      });

      await expect(apiClient.patch('/overtime/overtime-1/reject', {})).rejects.toThrow();
    });

    it('should handle rejection error (already rejected)', async () => {
      mock.onPatch('/overtime/overtime-1/reject').reply(400, {
        statusCode: 400,
        message: 'Overtime already rejected',
        error: 'BadRequest',
      });

      await expect(
        apiClient.patch('/overtime/overtime-1/reject', { rejection_reason: 'Test' })
      ).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle server error', async () => {
      mock.onGet('/overtime').reply(500, {
        statusCode: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
      });

      await expect(apiClient.get('/overtime')).rejects.toThrow();
    });

    it('should handle network error', async () => {
      mock.onGet('/overtime').networkError();

      await expect(apiClient.get('/overtime')).rejects.toThrow();
    });
  });
});
