/**
 * Unit Tests: Rayons API
 * Tests rayon CRUD operations
 */

import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '../client';
import type { Rayon, PaginatedResponse } from '@/types/models';

describe('Rayons API', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  const mockRayon: Rayon = {
    id: '1',
    name: 'Rayon Selatan',
    code: 'RAY-SEL',
    description: 'Covers southern area of Surabaya',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  describe('GET /rayons', () => {
    it('should fetch rayons list', async () => {
      const mockResponse: PaginatedResponse<Rayon> = {
        data: [mockRayon],
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mockAxios.onGet(/\/rayons/).reply(200, mockResponse);

      const response = await apiClient.get<PaginatedResponse<Rayon>>('/rayons');

      expect(response.data.data).toHaveLength(1);
      expect(response.data.data[0].name).toBe('Rayon Selatan');
    });

    it('should fetch all rayons without pagination', async () => {
      mockAxios.onGet(/\/rayons/).reply(200, {
        data: [mockRayon],
        meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
      });

      const response = await apiClient.get('/rayons');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /rayons/:id', () => {
    it('should fetch single rayon by ID', async () => {
      mockAxios.onGet('/rayons/1').reply(200, mockRayon);

      const response = await apiClient.get<Rayon>('/rayons/1');

      expect(response.data.name).toBe('Rayon Selatan');
      expect(response.data.code).toBe('RAY-SEL');
    });

    it('should handle rayon not found', async () => {
      mockAxios.onGet('/rayons/999').reply(404, {
        statusCode: 404,
        message: 'Rayon not found',
        error: 'NotFound',
      });

      await expect(apiClient.get('/rayons/999')).rejects.toThrow();
    });
  });

  describe('POST /rayons', () => {
    it('should create new rayon', async () => {
      const newRayon = {
        name: 'Rayon Barat',
        code: 'RAY-BAR',
        description: 'Western area',
      };

      mockAxios.onPost('/rayons', newRayon).reply(201, {
        ...newRayon,
        id: '10',
        created_at: '2026-02-04T00:00:00Z',
      });

      const response = await apiClient.post('/rayons', newRayon);

      expect(response.status).toBe(201);
      expect(response.data.name).toBe('Rayon Barat');
    });

    it('should handle validation errors', async () => {
      mockAxios.onPost('/rayons').reply(400, {
        statusCode: 400,
        message: 'Validation failed',
        errors: {
          name: 'Name is required',
          code: 'Code must be unique',
        },
      });

      await expect(apiClient.post('/rayons', {})).rejects.toThrow();
    });
  });

  describe('PATCH /rayons/:id', () => {
    it('should update rayon', async () => {
      const updateData = {
        description: 'Updated description',
      };

      mockAxios.onPatch('/rayons/1', updateData).reply(200, {
        ...mockRayon,
        ...updateData,
      });

      const response = await apiClient.patch('/rayons/1', updateData);

      expect(response.data.description).toBe('Updated description');
    });
  });

  describe('DELETE /rayons/:id', () => {
    it('should delete rayon', async () => {
      mockAxios.onDelete('/rayons/1').reply(204);

      const response = await apiClient.delete('/rayons/1');

      expect(response.status).toBe(204);
    });

    it('should handle delete error when rayon has areas', async () => {
      mockAxios.onDelete('/rayons/1').reply(400, {
        statusCode: 400,
        message: 'Cannot delete rayon with existing areas',
        error: 'BadRequest',
      });

      await expect(apiClient.delete('/rayons/1')).rejects.toThrow();
    });
  });

  describe('GET /rayons/:id/stats', () => {
    it('should fetch rayon statistics', async () => {
      const mockStats = {
        total_areas: 15,
        total_workers: 30,
        active_tasks: 5,
        completed_reports_today: 12,
      };

      mockAxios.onGet('/rayons/1/stats').reply(200, mockStats);

      const response = await apiClient.get('/rayons/1/stats');

      expect(response.data.total_areas).toBe(15);
      expect(response.data.total_workers).toBe(30);
    });
  });
});
