/**
 * Overtime API Service Tests
 * Phase 2C: new overtime management module
 */

import * as overtimeApi from '../overtimeApi';
import * as apiClient from '../apiClient';

jest.mock('../apiClient', () => ({
  __esModule: true,
  default: {
    patch: jest.fn(),
  },
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
}));

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockPatch = apiClient.patch as jest.MockedFunction<typeof apiClient.patch>;

describe('overtimeApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('submitOvertime', () => {
    it('submits overtime with correct data', async () => {
      const overtimeData = {
        start_datetime: '2026-02-14T17:00:00+07:00',
        end_datetime: '2026-02-14T20:00:00+07:00',
        activity_type_id: 'type-001',
        description: 'Lembur penyiraman',
        photo_urls: ['https://s3.amazonaws.com/photo1.jpg'],
        gps_lat: -7.25,
        gps_lng: 112.75,
      };
      const mockResponse = {
        data: { id: 'ot-001', status: 'pending', ...overtimeData },
      };
      mockPost.mockResolvedValue(mockResponse);

      const result = await overtimeApi.submitOvertime(overtimeData);

      expect(mockPost).toHaveBeenCalledWith('/overtime', overtimeData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getMyOvertimes', () => {
    it('gets user overtimes without filters', async () => {
      const mockResponse = {
        data: { data: [{ id: 'ot-1', status: 'pending' }], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await overtimeApi.getMyOvertimes();

      expect(mockGet).toHaveBeenCalledWith('/overtime/my');
      expect(result).toEqual(mockResponse);
    });

    it('gets user overtimes with filters', async () => {
      const mockResponse = {
        data: { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await overtimeApi.getMyOvertimes({ status: 'pending', page: 1, limit: 10 });

      expect(mockGet).toHaveBeenCalledWith('/overtime/my?status=pending&page=1&limit=10');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getOvertimes', () => {
    it('gets all overtimes without filters', async () => {
      const mockResponse = { data: { data: [{ id: 'ot-1', status: 'pending' }], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } } };
      mockGet.mockResolvedValue(mockResponse);

      const result = await overtimeApi.getOvertimes();

      expect(mockGet).toHaveBeenCalledWith('/overtime');
      expect(result).toEqual(mockResponse);
    });

    it('gets overtimes filtered by status=pending', async () => {
      const mockResponse = { data: { data: [{ id: 'ot-1', status: 'pending' }], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } } };
      mockGet.mockResolvedValue(mockResponse);

      const result = await overtimeApi.getOvertimes({ status: 'pending' });

      expect(mockGet).toHaveBeenCalledWith('/overtime?status=pending');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getOvertimeById', () => {
    it('gets overtime by ID', async () => {
      const mockResponse = {
        data: { id: 'ot-123', description: 'Lembur penyiraman' },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await overtimeApi.getOvertimeById('ot-123');

      expect(mockGet).toHaveBeenCalledWith('/overtime/ot-123');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('approveOvertime', () => {
    it('approves overtime successfully', async () => {
      const mockResponse = { data: { id: 'ot-123', status: 'approved' } };
      mockPatch.mockResolvedValue(mockResponse);

      const result = await overtimeApi.approveOvertime('ot-123');

      expect(mockPatch).toHaveBeenCalledWith('/overtime/ot-123/approve');
      expect(result).toEqual(mockResponse);
    });

    it('returns error on failure', async () => {
      const mockResponse = { error: 'Network error' };
      mockPatch.mockResolvedValue(mockResponse);

      const result = await overtimeApi.approveOvertime('ot-123');

      expect(result).toEqual({ error: 'Network error' });
    });
  });

  describe('rejectOvertime', () => {
    it('rejects overtime with reason', async () => {
      const mockResponse = { data: { id: 'ot-123', status: 'rejected' } };
      mockPatch.mockResolvedValue(mockResponse);

      const result = await overtimeApi.rejectOvertime(
        'ot-123',
        'Tidak sesuai prosedur',
      );

      expect(mockPatch).toHaveBeenCalledWith('/overtime/ot-123/reject', {
        reason: 'Tidak sesuai prosedur',
      });
      expect(result).toEqual(mockResponse);
    });

    it('returns error on failure', async () => {
      const mockResponse = { error: 'Unauthorized' };
      mockPatch.mockResolvedValue(mockResponse);

      const result = await overtimeApi.rejectOvertime('ot-123', 'reason');

      expect(result).toEqual({ error: 'Unauthorized' });
    });
  });

  describe('default export', () => {
    it('exports all functions', () => {
      const defaultExport = overtimeApi.default;
      expect(defaultExport.submitOvertime).toBeDefined();
      expect(defaultExport.getMyOvertimes).toBeDefined();
      expect(defaultExport.getOvertimes).toBeDefined();
      expect(defaultExport.getOvertimeById).toBeDefined();
      expect(defaultExport.approveOvertime).toBeDefined();
      expect(defaultExport.rejectOvertime).toBeDefined();
    });
  });
});
