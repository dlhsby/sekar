/**
 * Unit Tests: Schedules API
 * Tests worker schedule CRUD operations
 */

import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import type { WorkerSchedule, PaginatedResponse } from '@/types/models';

describe('Schedules API', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  const mockSchedule: WorkerSchedule = {
    id: '1',
    worker_id: 'worker-1',
    shift_definition_id: 'shift-1',
    area_id: 'area-1',
    date: '2026-02-04',
    status: 'scheduled',
    created_at: '2026-02-03T00:00:00Z',
  };

  describe('GET /worker-schedules', () => {
    it('should fetch schedules list', async () => {
      const mockResponse: PaginatedResponse<WorkerSchedule> = {
        data: [mockSchedule],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mockAxios.onGet(/\/worker-schedules/).reply(200, mockResponse);

      const response = await apiClient.get<PaginatedResponse<WorkerSchedule>>('/worker-schedules');

      expect(response.data.data).toHaveLength(1);
      expect(response.data.data[0].status).toBe('scheduled');
    });

    it('should fetch schedules with date filter', async () => {
      mockAxios.onGet(/\/worker-schedules\?date=2026-02-04/).reply(200, {
        data: [mockSchedule],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const response = await apiClient.get('/worker-schedules?date=2026-02-04');

      expect(response.data.data).toHaveLength(1);
    });

    it('should fetch schedules with worker filter', async () => {
      mockAxios.onGet(/\/worker-schedules\?worker_id=worker-1/).reply(200, {
        data: [mockSchedule],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });

      const response = await apiClient.get('/worker-schedules?worker_id=worker-1');

      expect(response.data.data[0].worker_id).toBe('worker-1');
    });

    it('should fetch schedules with status filter', async () => {
      mockAxios.onGet(/\/worker-schedules\?status=completed/).reply(200, {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      const response = await apiClient.get('/worker-schedules?status=completed');

      expect(response.data.data).toHaveLength(0);
    });
  });

  describe('GET /worker-schedules/:id', () => {
    it('should fetch single schedule by ID', async () => {
      mockAxios.onGet('/worker-schedules/1').reply(200, mockSchedule);

      const response = await apiClient.get<WorkerSchedule>('/worker-schedules/1');

      expect(response.data.worker_id).toBe('worker-1');
      expect(response.data.date).toBe('2026-02-04');
    });

    it('should handle schedule not found', async () => {
      mockAxios.onGet('/worker-schedules/999').reply(404, {
        statusCode: 404,
        message: 'Schedule not found',
        error: 'NotFound',
      });

      await expect(apiClient.get('/worker-schedules/999')).rejects.toThrow();
    });
  });

  describe('POST /worker-schedules', () => {
    it('should create new schedule', async () => {
      const newSchedule = {
        worker_id: 'worker-2',
        shift_definition_id: 'shift-1',
        area_id: 'area-2',
        date: '2026-02-05',
      };

      mockAxios.onPost('/worker-schedules', newSchedule).reply(201, {
        ...newSchedule,
        id: '10',
        status: 'scheduled',
        created_at: '2026-02-04T00:00:00Z',
      });

      const response = await apiClient.post('/worker-schedules', newSchedule);

      expect(response.status).toBe(201);
      expect(response.data.worker_id).toBe('worker-2');
    });

    it('should handle validation errors', async () => {
      mockAxios.onPost('/worker-schedules').reply(400, {
        statusCode: 400,
        message: 'Validation failed',
        errors: {
          worker_id: 'Worker ID is required',
          date: 'Date must be in the future',
        },
      });

      await expect(apiClient.post('/worker-schedules', {})).rejects.toThrow();
    });

    it('should handle duplicate schedule error', async () => {
      mockAxios.onPost('/worker-schedules').reply(409, {
        statusCode: 409,
        message: 'Worker already has a schedule for this date',
        error: 'Conflict',
      });

      await expect(apiClient.post('/worker-schedules', {})).rejects.toThrow();
    });
  });

  describe('PATCH /worker-schedules/:id', () => {
    it('should update schedule', async () => {
      const updateData = {
        area_id: 'area-3',
        status: 'completed',
      };

      mockAxios.onPatch('/worker-schedules/1', updateData).reply(200, {
        ...mockSchedule,
        ...updateData,
      });

      const response = await apiClient.patch('/worker-schedules/1', updateData);

      expect(response.data.area_id).toBe('area-3');
      expect(response.data.status).toBe('completed');
    });
  });

  describe('DELETE /worker-schedules/:id', () => {
    it('should delete schedule', async () => {
      mockAxios.onDelete('/worker-schedules/1').reply(204);

      const response = await apiClient.delete('/worker-schedules/1');

      expect(response.status).toBe(204);
    });

    it('should handle delete error for completed schedule', async () => {
      mockAxios.onDelete('/worker-schedules/1').reply(400, {
        statusCode: 400,
        message: 'Cannot delete completed schedule',
        error: 'BadRequest',
      });

      await expect(apiClient.delete('/worker-schedules/1')).rejects.toThrow();
    });
  });

  describe('POST /worker-schedules/bulk', () => {
    it('should create multiple schedules', async () => {
      const bulkData = {
        worker_ids: ['worker-1', 'worker-2'],
        shift_definition_id: 'shift-1',
        area_id: 'area-1',
        dates: ['2026-02-04', '2026-02-05'],
      };

      mockAxios.onPost('/worker-schedules/bulk', bulkData).reply(201, {
        created: 4,
        schedules: [],
      });

      const response = await apiClient.post('/worker-schedules/bulk', bulkData);

      expect(response.data.created).toBe(4);
    });
  });
});
