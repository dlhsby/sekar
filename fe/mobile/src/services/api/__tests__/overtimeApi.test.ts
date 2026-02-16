/**
 * Overtime API Service Tests
 * Phase 2C: new overtime management module
 */

import * as overtimeApi from '../overtimeApi';
import * as apiClient from '../apiClient';
import apiClientDefault from '../apiClient';

jest.mock('../apiClient', () => ({
  __esModule: true,
  default: {
    patch: jest.fn(),
  },
  get: jest.fn(),
  post: jest.fn(),
}));

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockPatch = apiClientDefault.patch as jest.MockedFunction<
  typeof apiClientDefault.patch
>;

describe('overtimeApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('submitOvertime', () => {
    it('submits overtime with correct data', async () => {
      const overtimeData = {
        date: '2026-02-14',
        start_time: '17:00',
        end_time: '20:00',
        activity_type_id: 'type-001',
        description: 'Lembur penyiraman',
        photos: ['data:image/jpeg;base64,photo1'],
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
    it('gets user overtimes', async () => {
      const mockResponse = {
        data: [
          { id: 'ot-1', status: 'pending' },
          { id: 'ot-2', status: 'approved' },
        ],
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await overtimeApi.getMyOvertimes();

      expect(mockGet).toHaveBeenCalledWith('/overtime/my');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getPendingApprovals', () => {
    it('gets pending approvals for korlap', async () => {
      const mockResponse = { data: [{ id: 'ot-1', status: 'pending' }] };
      mockGet.mockResolvedValue(mockResponse);

      const result = await overtimeApi.getPendingApprovals();

      expect(mockGet).toHaveBeenCalledWith('/overtime');
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
      expect(result).toEqual({ data: mockResponse.data });
    });

    it('returns error on failure', async () => {
      mockPatch.mockRejectedValue(new Error('Network error'));

      const result = await overtimeApi.approveOvertime('ot-123');

      expect(result).toEqual({ error: 'Network error' });
    });

    it('returns generic error for non-Error throws', async () => {
      mockPatch.mockRejectedValue('unknown error');

      const result = await overtimeApi.approveOvertime('ot-123');

      expect(result).toEqual({ error: 'Approve failed' });
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
      expect(result).toEqual({ data: mockResponse.data });
    });

    it('returns error on failure', async () => {
      mockPatch.mockRejectedValue(new Error('Unauthorized'));

      const result = await overtimeApi.rejectOvertime('ot-123', 'reason');

      expect(result).toEqual({ error: 'Unauthorized' });
    });

    it('returns generic error for non-Error throws', async () => {
      mockPatch.mockRejectedValue(42);

      const result = await overtimeApi.rejectOvertime('ot-123', 'reason');

      expect(result).toEqual({ error: 'Reject failed' });
    });
  });

  describe('default export', () => {
    it('exports all functions', () => {
      const defaultExport = overtimeApi.default;
      expect(defaultExport.submitOvertime).toBeDefined();
      expect(defaultExport.getMyOvertimes).toBeDefined();
      expect(defaultExport.getPendingApprovals).toBeDefined();
      expect(defaultExport.getOvertimeById).toBeDefined();
      expect(defaultExport.approveOvertime).toBeDefined();
      expect(defaultExport.rejectOvertime).toBeDefined();
    });
  });
});
