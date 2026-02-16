/**
 * Unit Tests: Schedules API
 * Tests schedule CRUD operations (Phase 2C: renamed from worker-schedules)
 */

import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import type { Schedule, PaginatedResponse } from '@/types/models';

describe('Schedules API', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  const mockSchedule: Schedule = {
    id: '1',
    user_id: 'user-1',
    shift_definition_id: 'shift-1',
    area_id: 'area-1',
    effective_date: '2026-02-04',
    created_at: '2026-02-03T00:00:00Z',
    updated_at: '2026-02-03T00:00:00Z',
  };

  describe('GET /schedules', () => {
    it('should fetch schedules list', async () => {
      const mockResponse: PaginatedResponse<Schedule> = {
        data: [mockSchedule],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mockAxios.onGet(/\/schedules/).reply(200, mockResponse);

      const response = await apiClient.get<PaginatedResponse<Schedule>>('/schedules');

      expect(response.data.data).toHaveLength(1);
      expect(response.data.data[0].effective_date).toBe('2026-02-04');
    });

    it('should fetch schedules with date filter', async () => {
      mockAxios.onGet(/\/schedules\?date=2026-02-04/).reply(200, {
        data: [mockSchedule],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const response = await apiClient.get('/schedules?date=2026-02-04');

      expect(response.data.data).toHaveLength(1);
    });

    it('should fetch schedules with user filter', async () => {
      mockAxios.onGet(/\/schedules\?user_id=user-1/).reply(200, {
        data: [mockSchedule],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const response = await apiClient.get('/schedules?user_id=user-1');

      expect(response.data.data[0].user_id).toBe('user-1');
    });

    it('should fetch schedules with status filter', async () => {
      mockAxios.onGet(/\/schedules\?status=completed/).reply(200, {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      const response = await apiClient.get('/schedules?status=completed');

      expect(response.data.data).toHaveLength(0);
    });
  });

  describe('GET /schedules/:id', () => {
    it('should fetch single schedule by ID', async () => {
      mockAxios.onGet('/schedules/1').reply(200, mockSchedule);

      const response = await apiClient.get<Schedule>('/schedules/1');

      expect(response.data.user_id).toBe('user-1');
      expect(response.data.effective_date).toBe('2026-02-04');
    });

    it('should handle schedule not found', async () => {
      mockAxios.onGet('/schedules/999').reply(404, {
        statusCode: 404,
        message: 'Schedule not found',
        error: 'NotFound',
      });

      await expect(apiClient.get('/schedules/999')).rejects.toThrow();
    });
  });

  describe('POST /schedules', () => {
    it('should create new schedule', async () => {
      const newSchedule = {
        user_id: 'user-2',
        shift_definition_id: 'shift-1',
        area_id: 'area-2',
        effective_date: '2026-02-05',
      };

      mockAxios.onPost('/schedules', newSchedule).reply(201, {
        ...newSchedule,
        id: '10',
        created_at: '2026-02-04T00:00:00Z',
        updated_at: '2026-02-04T00:00:00Z',
      });

      const response = await apiClient.post('/schedules', newSchedule);

      expect(response.status).toBe(201);
      expect(response.data.user_id).toBe('user-2');
    });

    it('should handle validation errors', async () => {
      mockAxios.onPost('/schedules').reply(400, {
        statusCode: 400,
        message: 'Validation failed',
        errors: {
          user_id: 'User ID is required',
          effective_date: 'Date must be in the future',
        },
      });

      await expect(apiClient.post('/schedules', {})).rejects.toThrow();
    });

    it('should handle duplicate schedule error', async () => {
      mockAxios.onPost('/schedules').reply(409, {
        statusCode: 409,
        message: 'User already has a schedule for this date',
        error: 'Conflict',
      });

      await expect(apiClient.post('/schedules', {})).rejects.toThrow();
    });
  });

  describe('PATCH /schedules/:id', () => {
    it('should update schedule', async () => {
      const updateData = {
        area_id: 'area-3',
      };

      mockAxios.onPatch('/schedules/1', updateData).reply(200, {
        ...mockSchedule,
        ...updateData,
      });

      const response = await apiClient.patch('/schedules/1', updateData);

      expect(response.data.area_id).toBe('area-3');
    });
  });

  describe('DELETE /schedules/:id', () => {
    it('should delete schedule', async () => {
      mockAxios.onDelete('/schedules/1').reply(204);

      const response = await apiClient.delete('/schedules/1');

      expect(response.status).toBe(204);
    });

    it('should handle delete error for completed schedule', async () => {
      mockAxios.onDelete('/schedules/1').reply(400, {
        statusCode: 400,
        message: 'Cannot delete completed schedule',
        error: 'BadRequest',
      });

      await expect(apiClient.delete('/schedules/1')).rejects.toThrow();
    });
  });

  describe('POST /schedules/bulk', () => {
    it('should create multiple schedules', async () => {
      const bulkData = {
        user_ids: ['user-1', 'user-2'],
        shift_definition_id: 'shift-1',
        area_id: 'area-1',
        dates: ['2026-02-04', '2026-02-05'],
      };

      mockAxios.onPost('/schedules/bulk', bulkData).reply(201, {
        created: 4,
        schedules: [],
      });

      const response = await apiClient.post('/schedules/bulk', bulkData);

      expect(response.data.created).toBe(4);
    });
  });
});
