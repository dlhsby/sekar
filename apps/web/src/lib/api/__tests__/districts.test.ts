/**
 * Unit Tests: Districts API
 * Tests district CRUD operations
 */

import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import type { District, PaginatedResponse } from '@/types/models';

describe('Districts API', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  const mockDistrict: District = {
    id: '1',
    name: 'Rayon Selatan',
    description: 'Covers southern area of Surabaya',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  describe('GET /districts', () => {
    it('should fetch districts list', async () => {
      const mockResponse: PaginatedResponse<District> = {
        data: [mockDistrict],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mockAxios.onGet(/\/districts/).reply(200, mockResponse);

      const response = await apiClient.get<PaginatedResponse<District>>('/districts');

      expect(response.data.data).toHaveLength(1);
      expect(response.data.data[0].name).toBe('Rayon Selatan');
    });

    it('should fetch all districts without pagination', async () => {
      mockAxios.onGet(/\/districts/).reply(200, {
        data: [mockDistrict],
        meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
      });

      const response = await apiClient.get('/districts');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /districts/:id', () => {
    it('should fetch single district by ID', async () => {
      mockAxios.onGet('/districts/1').reply(200, mockDistrict);

      const response = await apiClient.get<District>('/districts/1');

      expect(response.data.name).toBe('Rayon Selatan');
    });

    it('should handle district not found', async () => {
      mockAxios.onGet('/districts/999').reply(404, {
        statusCode: 404,
        message: 'Rayon not found',
        error: 'NotFound',
      });

      await expect(apiClient.get('/districts/999')).rejects.toThrow();
    });
  });

  describe('POST /districts', () => {
    it('should create new district', async () => {
      const newDistrict = {
        name: 'Rayon Barat',
        description: 'Western area',
      };

      mockAxios.onPost('/districts', newDistrict).reply(201, {
        ...newDistrict,
        id: '10',
        created_at: '2026-02-04T00:00:00Z',
      });

      const response = await apiClient.post('/districts', newDistrict);

      expect(response.status).toBe(201);
      expect(response.data.name).toBe('Rayon Barat');
    });

    it('should handle validation errors', async () => {
      mockAxios.onPost('/districts').reply(400, {
        statusCode: 400,
        message: 'Validation failed',
        errors: {
          name: 'Name is required',
        },
      });

      await expect(apiClient.post('/districts', {})).rejects.toThrow();
    });
  });

  describe('PATCH /districts/:id', () => {
    it('should update district', async () => {
      const updateData = {
        description: 'Updated description',
      };

      mockAxios.onPatch('/districts/1', updateData).reply(200, {
        ...mockDistrict,
        ...updateData,
      });

      const response = await apiClient.patch('/districts/1', updateData);

      expect(response.data.description).toBe('Updated description');
    });
  });

  describe('DELETE /districts/:id', () => {
    it('should delete district', async () => {
      mockAxios.onDelete('/districts/1').reply(204);

      const response = await apiClient.delete('/districts/1');

      expect(response.status).toBe(204);
    });

    it('should handle delete error when district has areas', async () => {
      mockAxios.onDelete('/districts/1').reply(400, {
        statusCode: 400,
        message: 'Cannot delete district with existing areas',
        error: 'BadRequest',
      });

      await expect(apiClient.delete('/districts/1')).rejects.toThrow();
    });
  });

  describe('GET /districts/:id/stats', () => {
    it('should fetch district statistics', async () => {
      const mockStats = {
        total_areas: 15,
        total_workers: 30,
        active_tasks: 5,
        completed_reports_today: 12,
      };

      mockAxios.onGet('/districts/1/stats').reply(200, mockStats);

      const response = await apiClient.get('/districts/1/stats');

      expect(response.data.total_areas).toBe(15);
      expect(response.data.total_workers).toBe(30);
    });
  });
});
