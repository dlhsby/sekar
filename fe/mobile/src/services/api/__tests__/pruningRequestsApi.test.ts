/**
 * Pruning Requests API Tests
 * API client for pruning request management
 * Phase 3 sub-phase 3-10
 */

import * as pruningRequestsApi from '../pruningRequestsApi';
import * as apiClient from '../apiClient';

jest.mock('../apiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;

const mockPruningRequest = {
  id: 'req-1',
  referenceCode: 'PR-001',
  address: 'Jl. Test 1',
  status: 'submitted' as const,
  rayon_id: 'r1',
  rayon: { id: 'r1', name: 'Rayon 1' },
  createdAt: new Date().toISOString(),
  photoUrls: ['url1'],
  gpsLat: -7.25,
  gpsLng: 112.75,
  expectedDate: new Date().toISOString(),
  estimatedPlantCount: 5,
  notes: 'Test notes',
};

describe('pruningRequestsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAdminPruningRequests', () => {
    it('returns list of pruning requests on success', async () => {
      const mockResponse = {
        success: true,
        data: [mockPruningRequest],
        meta: { total: 1, page: 1, limit: 20 },
      };

      mockGet.mockResolvedValue(mockResponse);

      const result = await pruningRequestsApi.getAdminPruningRequests();

      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockPruningRequest]);
    });

    it('calls API endpoint without mine parameter', async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: [],
      });

      await pruningRequestsApi.getAdminPruningRequests();

      expect(mockGet).toHaveBeenCalledWith(
        '/pruning-requests',
        undefined,
      );
    });

    it('includes status filter when provided', async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: [],
      });

      await pruningRequestsApi.getAdminPruningRequests({
        status: 'submitted',
      });

      expect(mockGet).toHaveBeenCalledWith(
        '/pruning-requests',
        expect.objectContaining({
          status: 'submitted',
        }),
      );
    });

    it('includes rayonId filter when provided', async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: [],
      });

      await pruningRequestsApi.getAdminPruningRequests({
        rayonId: 'r1',
      });

      expect(mockGet).toHaveBeenCalledWith(
        '/pruning-requests',
        expect.objectContaining({
          rayonId: 'r1',
        }),
      );
    });

    it('includes pagination parameters', async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: [],
      });

      await pruningRequestsApi.getAdminPruningRequests({
        page: 2,
        limit: 50,
      });

      expect(mockGet).toHaveBeenCalledWith(
        '/pruning-requests',
        expect.objectContaining({
          page: 2,
          limit: 50,
        }),
      );
    });

    it('includes date range filters', async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: [],
      });

      await pruningRequestsApi.getAdminPruningRequests({
        from: '2026-01-01',
        to: '2026-01-31',
      });

      expect(mockGet).toHaveBeenCalledWith(
        '/pruning-requests',
        expect.objectContaining({
          from: '2026-01-01',
          to: '2026-01-31',
        }),
      );
    });

    it('handles empty result', async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: [],
        meta: { total: 0, page: 1, limit: 20 },
      });

      const result = await pruningRequestsApi.getAdminPruningRequests();

      expect(result.data).toEqual([]);
    });

    it('handles API error response', async () => {
      const mockError = {
        error: { error: 'Forbidden', code: 'ERR_FORBIDDEN' },
        data: null,
      };

      mockGet.mockResolvedValue(mockError);

      const result = await pruningRequestsApi.getAdminPruningRequests();

      expect(result.error).toEqual({ error: 'Forbidden', code: 'ERR_FORBIDDEN' });
    });

    it('handles network error', async () => {
      mockGet.mockResolvedValue({
        error: 'Network error',
        code: 'NETWORK_ERROR',
      });

      const result = await pruningRequestsApi.getAdminPruningRequests();

      expect(result.error).toBeDefined();
    });
  });

  describe('reviewPruningRequest', () => {
    it('approves pruning request', async () => {
      const mockResponse = {
        success: true,
        data: { ...mockPruningRequest, status: 'approved' as const },
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await pruningRequestsApi.reviewPruningRequest('req-1', {
        decision: 'approve',
      });

      expect(result).toEqual(mockResponse);
      expect(result.data?.status).toBe('approved');
    });

    it('rejects pruning request', async () => {
      const mockResponse = {
        success: true,
        data: { ...mockPruningRequest, status: 'rejected' as const },
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await pruningRequestsApi.reviewPruningRequest('req-1', {
        decision: 'reject',
      });

      expect(result).toEqual(mockResponse);
      expect(result.data?.status).toBe('rejected');
    });

    it('includes review notes when provided', async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: mockPruningRequest,
      });

      await pruningRequestsApi.reviewPruningRequest('req-1', {
        decision: 'reject',
        reviewNotes: 'Insufficient documentation',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/pruning-requests/req-1/review',
        expect.objectContaining({
          decision: 'reject',
          reviewNotes: 'Insufficient documentation',
        }),
      );
    });

    it('calls correct API endpoint', async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: mockPruningRequest,
      });

      await pruningRequestsApi.reviewPruningRequest('req-123', {
        decision: 'approve',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/pruning-requests/req-123/review',
        expect.any(Object),
      );
    });

    it('handles API error on review', async () => {
      const mockError = {
        error: { error: 'Request not found', code: 'ERR_NOT_FOUND' },
        data: null,
      };

      mockPost.mockResolvedValue(mockError);

      const result = await pruningRequestsApi.reviewPruningRequest('req-999', {
        decision: 'approve',
      });

      expect(result.error).toEqual({
        error: 'Request not found',
        code: 'ERR_NOT_FOUND',
      });
    });

    it('handles network error on review', async () => {
      mockPost.mockResolvedValue({
        error: 'Network timeout',
        code: 'NETWORK_ERROR',
      });

      const result = await pruningRequestsApi.reviewPruningRequest('req-1', {
        decision: 'approve',
      });

      expect(result.error).toBeDefined();
    });

    it('accepts both approve and reject decisions', async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: mockPruningRequest,
      });

      await pruningRequestsApi.reviewPruningRequest('req-1', {
        decision: 'approve',
      });

      expect(mockPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ decision: 'approve' }),
      );

      await pruningRequestsApi.reviewPruningRequest('req-1', {
        decision: 'reject',
      });

      expect(mockPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ decision: 'reject' }),
      );
    });
  });

  describe('convertPruningRequestToTask', () => {
    const conversionData = {
      areaId: 'area1',
      assignedTo: 'user1',
      scheduledDate: '2026-05-01',
      caseType: 'PT' as const,
      pruningAction: 'PM' as const,
      units: 3,
    };

    it('converts pruning request to task', async () => {
      const mockResponse = {
        success: true,
        data: {
          request: { ...mockPruningRequest, status: 'converted' as const },
          task: { id: 'task1', name: 'Task 1' },
        },
      };

      mockPost.mockResolvedValue(mockResponse);

      const result = await pruningRequestsApi.convertPruningRequestToTask(
        'req-1',
        conversionData,
      );

      expect(result).toEqual(mockResponse);
      expect(result.data?.request?.status).toBe('converted');
    });

    it('includes all conversion fields', async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: mockPruningRequest,
      });

      await pruningRequestsApi.convertPruningRequestToTask(
        'req-1',
        conversionData,
      );

      expect(mockPost).toHaveBeenCalledWith(
        '/pruning-requests/req-1/convert-to-task',
        expect.objectContaining(conversionData),
      );
    });

    it('calls correct API endpoint', async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: mockPruningRequest,
      });

      await pruningRequestsApi.convertPruningRequestToTask('req-456', conversionData);

      expect(mockPost).toHaveBeenCalledWith(
        '/pruning-requests/req-456/convert-to-task',
        expect.any(Object),
      );
    });

    it('handles different case types', async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: mockPruningRequest,
      });

      const caseTypes = ['GT', 'PT', 'PS', 'PD', 'PK'] as const;

      for (const caseType of caseTypes) {
        await pruningRequestsApi.convertPruningRequestToTask('req-1', {
          ...conversionData,
          caseType,
        });

        expect(mockPost).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ caseType }),
        );
      }
    });

    it('handles different pruning actions', async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: mockPruningRequest,
      });

      const actions = ['PM', 'PB', 'PC'] as const;

      for (const action of actions) {
        await pruningRequestsApi.convertPruningRequestToTask('req-1', {
          ...conversionData,
          pruningAction: action,
        });

        expect(mockPost).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ pruningAction: action }),
        );
      }
    });

    it('handles variable unit counts', async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: mockPruningRequest,
      });

      await pruningRequestsApi.convertPruningRequestToTask('req-1', {
        ...conversionData,
        units: 10,
      });

      expect(mockPost).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ units: 10 }),
      );
    });

    it('handles API error on conversion', async () => {
      const mockError = {
        error: {
          error: 'Capacity exceeded',
          code: 'ERR_CAPACITY_EXCEEDED',
        },
        data: null,
      };

      mockPost.mockResolvedValue(mockError);

      const result = await pruningRequestsApi.convertPruningRequestToTask(
        'req-1',
        conversionData,
      );

      expect(result.error).toEqual({
        error: 'Capacity exceeded',
        code: 'ERR_CAPACITY_EXCEEDED',
      });
    });

    it('handles network error on conversion', async () => {
      mockPost.mockResolvedValue({
        error: 'Connection failed',
        code: 'NETWORK_ERROR',
      });

      const result = await pruningRequestsApi.convertPruningRequestToTask(
        'req-1',
        conversionData,
      );

      expect(result.error).toBeDefined();
    });

    it('validates request ID', async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: mockPruningRequest,
      });

      await pruningRequestsApi.convertPruningRequestToTask('req-789', conversionData);

      expect(mockPost).toHaveBeenCalledWith(
        '/pruning-requests/req-789/convert-to-task',
        expect.any(Object),
      );
    });

    it('preserves all data fields in request', async () => {
      mockPost.mockResolvedValue({
        success: true,
        data: mockPruningRequest,
      });

      const testData = {
        areaId: 'area-test',
        assignedTo: 'user-test',
        scheduledDate: '2026-06-15',
        caseType: 'GT' as const,
        pruningAction: 'PB' as const,
        units: 7,
      };

      await pruningRequestsApi.convertPruningRequestToTask('req-1', testData);

      const callArgs = mockPost.mock.calls[0][1];
      expect(callArgs).toEqual(expect.objectContaining(testData));
    });
  });

  describe('Error Handling', () => {
    it('returns error with code when available', async () => {
      mockGet.mockResolvedValue({
        error: 'Custom error',
        code: 'ERR_CUSTOM',
      });

      const result = await pruningRequestsApi.getAdminPruningRequests();

      expect(result.error).toBeDefined();
    });

    it('handles unknown error types gracefully', async () => {
      mockGet.mockResolvedValue({
        error: 'Unknown error type',
        code: 'UNKNOWN_ERROR',
      });

      const result = await pruningRequestsApi.getAdminPruningRequests();

      expect(result.error).toBeDefined();
    });
  });

  describe('Return Type Validation', () => {
    it('returns ApiResponse type', async () => {
      mockGet.mockResolvedValue({
        success: true,
        data: [mockPruningRequest],
      });

      const result = await pruningRequestsApi.getAdminPruningRequests();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
    });
  });

  describe('Multiple Requests', () => {
    it('returns multiple pruning requests', async () => {
      const requests = [
        mockPruningRequest,
        { ...mockPruningRequest, id: 'req-2', referenceCode: 'PR-002' },
        { ...mockPruningRequest, id: 'req-3', referenceCode: 'PR-003' },
      ];

      mockGet.mockResolvedValue({
        success: true,
        data: requests,
        meta: { total: 3, page: 1, limit: 20 },
      });

      const result = await pruningRequestsApi.getAdminPruningRequests();

      expect(result.data?.length).toBe(3);
      expect(result.data).toEqual(requests);
    });
  });

  describe('Status Filtering', () => {
    const statusValues = [
      'submitted',
      'under_review',
      'approved',
      'rejected',
      'converted',
    ] as const;

    it.each(statusValues)('filters by status %s', async (status) => {
      mockGet.mockResolvedValue({
        success: true,
        data: [{ ...mockPruningRequest, status }],
      });

      const result = await pruningRequestsApi.getAdminPruningRequests({
        status,
      });

      expect(mockGet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          status,
        }),
      );
    });
  });
});
