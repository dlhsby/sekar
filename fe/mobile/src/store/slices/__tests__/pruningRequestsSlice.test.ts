/**
 * Pruning Requests Slice Tests
 * Phase 3 sub-phase 3-10
 */

import { configureStore } from '@reduxjs/toolkit';
import pruningRequestsReducer, {
  updateDraft,
  setDraft,
  clearDraft,
  selectRequest,
  clearError,
  resetState,
  submitPruningRequest,
  fetchMyPruningRequests,
  fetchPruningRequestById,
  fetchAdminPruningRequests,
  reviewPruningRequest,
  convertPruningRequestToTask,
} from '../pruningRequestsSlice';
import * as pruningRequestsApi from '../../../services/api/pruningRequestsApi';
import type { PruningRequest } from '../../../types/models.types';

// Mock the API
jest.mock('../../../services/api/pruningRequestsApi');

describe('pruningRequestsSlice', () => {
  let store: ReturnType<typeof configureStore>;

  const mockPruningRequest: PruningRequest = {
    id: 'pr-001',
    referenceCode: 'PR-2026-001',
    submittedBy: {
      id: 'user-1',
      name: 'Test User',
      role: 'staff_kecamatan',
    },
    kecamatanName: 'Surabaya Pusat',
    address: 'Jln Pemuda No. 123',
    gpsLat: -7.2575,
    gpsLng: 112.7521,
    expectedDate: '2026-05-01',
    estimatedPlantCount: 15,
    photoUrls: ['https://example.com/photo1.jpg'],
    notes: 'Pohon sudah tua',
    status: 'submitted' as const,
    rayonId: 'rayon-1',
    rayon: {
      id: 'rayon-1',
      name: 'Rayon 1',
    },
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    convertedTaskId: null,
    convertedTask: null,
    createdAt: '2026-04-27T10:00:00Z',
    updatedAt: '2026-04-27T10:00:00Z',
  };

  beforeEach(() => {
    store = configureStore({
      reducer: {
        pruningRequests: pruningRequestsReducer,
      },
    });
    jest.clearAllMocks();
  });

  describe('reducers', () => {
    it('should initialize with empty state', () => {
      const state = store.getState().pruningRequests;
      expect(state.mine).toEqual([]);
      expect(state.byId).toEqual({});
      expect(state.draft).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isSubmitting).toBe(false);
      expect(state.submitStatus).toBe('idle');
      expect(state.error).toBeNull();
      expect(state.selectedRequestId).toBeNull();
    });

    it('should handle updateDraft with partial update', () => {
      store.dispatch(updateDraft({ address: 'Test Address' }));
      const state = store.getState().pruningRequests;

      expect(state.draft).not.toBeNull();
      expect(state.draft?.address).toBe('Test Address');
      expect(state.draft?.lat).toBeNull();
      expect(state.draft?.lng).toBeNull();
      expect(state.draft?.target_count).toBe(0);
    });

    it('should handle updateDraft on existing draft', () => {
      store.dispatch(updateDraft({ address: 'Test Address' }));
      store.dispatch(updateDraft({ target_count: 10 }));
      const state = store.getState().pruningRequests;

      expect(state.draft?.address).toBe('Test Address');
      expect(state.draft?.target_count).toBe(10);
    });

    it('should handle setDraft with complete draft', () => {
      const newDraft = {
        address: 'Complete Address',
        lat: -7.25,
        lng: 112.75,
        detail_date: '2026-05-01',
        target_count: 20,
        photo_keys: ['key1', 'key2'],
        notes: 'Test notes',
        rayon_id: 'rayon-1',
      };
      store.dispatch(setDraft(newDraft));
      const state = store.getState().pruningRequests;

      expect(state.draft).toEqual(newDraft);
    });

    it('should handle setDraft with null to clear', () => {
      store.dispatch(updateDraft({ address: 'Test' }));
      store.dispatch(setDraft(null));
      const state = store.getState().pruningRequests;

      expect(state.draft).toBeNull();
    });

    it('should handle clearDraft', () => {
      store.dispatch(updateDraft({ address: 'Test' }));
      store.dispatch(updateDraft({ target_count: 5 }));
      store.dispatch(clearDraft());
      const state = store.getState().pruningRequests;

      expect(state.draft).toBeNull();
      expect(state.submitStatus).toBe('idle');
      expect(state.error).toBeNull();
    });

    it('should handle selectRequest', () => {
      store.dispatch(selectRequest('pr-001'));
      const state = store.getState().pruningRequests;

      expect(state.selectedRequestId).toBe('pr-001');
    });

    it('should handle selectRequest with null', () => {
      store.dispatch(selectRequest('pr-001'));
      store.dispatch(selectRequest(null));
      const state = store.getState().pruningRequests;

      expect(state.selectedRequestId).toBeNull();
    });

    it('should handle clearError', () => {
      // Manually set error (simulate failed fetch)
      const stateAfterError = pruningRequestsReducer(
        {
          ...store.getState().pruningRequests,
          error: 'Test error',
        },
        clearError()
      );

      expect(stateAfterError.error).toBeNull();
    });

    it('should handle resetState', () => {
      store.dispatch(updateDraft({ address: 'Test' }));
      store.dispatch(selectRequest('pr-001'));
      store.dispatch(resetState());
      const state = store.getState().pruningRequests;

      expect(state.mine).toEqual([]);
      expect(state.byId).toEqual({});
      expect(state.draft).toBeNull();
      expect(state.selectedRequestId).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('submitPruningRequest thunk', () => {
    it('should handle pending state', async () => {
      const mockApi = pruningRequestsApi.submitPruningRequest as jest.Mock;
      mockApi.mockImplementation(() => new Promise(() => {})); // Never resolves

      const submitAction = submitPruningRequest({
        address: 'Test Address',
        lat: -7.25,
        lng: 112.75,
        detail_date: '2026-05-01',
        target_count: 15,
        photo_keys: ['key1'],
        notes: 'Test notes',
      });

      store.dispatch(submitAction);
      const state = store.getState().pruningRequests;

      expect(state.isSubmitting).toBe(true);
      expect(state.submitStatus).toBe('submitting');
      expect(state.error).toBeNull();
    });

    it('should handle fulfilled state and prepend request', async () => {
      const mockApi = pruningRequestsApi.submitPruningRequest as jest.Mock;
      mockApi.mockResolvedValue({
        error: null,
        data: mockPruningRequest,
      });

      const submitAction = submitPruningRequest({
        address: 'Test Address',
        lat: -7.25,
        lng: 112.75,
        detail_date: '2026-05-01',
        target_count: 15,
        photo_keys: ['key1'],
      });

      await store.dispatch(submitAction);
      const state = store.getState().pruningRequests;

      expect(state.isSubmitting).toBe(false);
      expect(state.submitStatus).toBe('success');
      expect(state.mine[0]).toEqual(mockPruningRequest);
      expect(state.byId[mockPruningRequest.id]).toEqual(mockPruningRequest);
      expect(state.draft).toBeNull();
      expect(state.error).toBeNull();
    });

    it('should handle rejected state', async () => {
      const mockApi = pruningRequestsApi.submitPruningRequest as jest.Mock;
      mockApi.mockRejectedValue(new Error('Address is required'));

      const submitAction = submitPruningRequest({
        address: '',
        lat: -7.25,
        lng: 112.75,
        detail_date: '2026-05-01',
        target_count: 15,
        photo_keys: ['key1'],
      });

      await store.dispatch(submitAction);
      const state = store.getState().pruningRequests;

      expect(state.isSubmitting).toBe(false);
      expect(state.submitStatus).toBe('error');
      expect(state.error).toBe('Address is required');
      expect(state.mine.length).toBe(0);
    });
  });

  describe('fetchMyPruningRequests thunk', () => {
    it('should handle pending state', async () => {
      const mockApi = pruningRequestsApi.getMyPruningRequests as jest.Mock;
      mockApi.mockImplementation(() => new Promise(() => {})); // Never resolves

      const fetchAction = fetchMyPruningRequests({ limit: 50, offset: 0 });
      store.dispatch(fetchAction);
      const state = store.getState().pruningRequests;

      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle fulfilled state with list', async () => {
      const mockRequests = [
        mockPruningRequest,
        { ...mockPruningRequest, id: 'pr-002', referenceCode: 'PR-2026-002' },
      ];
      const mockApi = pruningRequestsApi.getMyPruningRequests as jest.Mock;
      mockApi.mockResolvedValue({
        error: null,
        data: mockRequests,
      });

      const fetchAction = fetchMyPruningRequests({ limit: 50, offset: 0 });
      await store.dispatch(fetchAction);
      const state = store.getState().pruningRequests;

      expect(state.isLoading).toBe(false);
      expect(state.mine).toEqual(mockRequests);
      expect(state.byId['pr-001']).toEqual(mockPruningRequest);
      expect(state.byId['pr-002']).toEqual(mockRequests[1]);
      expect(state.error).toBeNull();
    });

    it('should handle fulfilled state with empty list', async () => {
      const mockApi = pruningRequestsApi.getMyPruningRequests as jest.Mock;
      mockApi.mockResolvedValue({
        error: null,
        data: [],
      });

      const fetchAction = fetchMyPruningRequests({ limit: 50, offset: 0 });
      await store.dispatch(fetchAction);
      const state = store.getState().pruningRequests;

      expect(state.isLoading).toBe(false);
      expect(state.mine).toEqual([]);
      expect(state.error).toBeNull();
    });

    it('should handle rejected state', async () => {
      const mockApi = pruningRequestsApi.getMyPruningRequests as jest.Mock;
      mockApi.mockRejectedValue(new Error('Unauthorized'));

      const fetchAction = fetchMyPruningRequests({ limit: 50, offset: 0 });
      await store.dispatch(fetchAction);
      const state = store.getState().pruningRequests;

      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Unauthorized');
      expect(state.mine.length).toBe(0);
    });
  });

  describe('fetchPruningRequestById thunk', () => {
    it('should handle pending state', async () => {
      const mockApi = pruningRequestsApi.getPruningRequestById as jest.Mock;
      mockApi.mockImplementation(() => new Promise(() => {})); // Never resolves

      const fetchAction = fetchPruningRequestById('pr-001');
      store.dispatch(fetchAction);
      const state = store.getState().pruningRequests;

      expect(state.isLoading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should handle fulfilled state and store in byId', async () => {
      const mockApi = pruningRequestsApi.getPruningRequestById as jest.Mock;
      mockApi.mockResolvedValue({
        error: null,
        data: mockPruningRequest,
      });

      const fetchAction = fetchPruningRequestById('pr-001');
      await store.dispatch(fetchAction);
      const state = store.getState().pruningRequests;

      expect(state.isLoading).toBe(false);
      expect(state.byId['pr-001']).toEqual(mockPruningRequest);
      expect(state.error).toBeNull();
    });

    it('should update in mine array if request already exists', async () => {
      // First, populate mine array
      const mockApi = pruningRequestsApi.getMyPruningRequests as jest.Mock;
      mockApi.mockResolvedValue({
        error: null,
        data: [mockPruningRequest],
      });
      await store.dispatch(fetchMyPruningRequests({ limit: 50, offset: 0 }));

      // Now fetch the same request but with updated status
      const updatedRequest = {
        ...mockPruningRequest,
        status: 'approved' as const,
      };
      const mockFetchApi = pruningRequestsApi.getPruningRequestById as jest.Mock;
      mockFetchApi.mockResolvedValue({
        error: null,
        data: updatedRequest,
      });

      await store.dispatch(fetchPruningRequestById('pr-001'));
      const state = store.getState().pruningRequests;

      expect(state.mine[0].status).toBe('approved');
      expect(state.byId['pr-001'].status).toBe('approved');
    });

    it('should handle rejected state', async () => {
      const mockApi = pruningRequestsApi.getPruningRequestById as jest.Mock;
      mockApi.mockRejectedValue(new Error('Not found'));

      const fetchAction = fetchPruningRequestById('invalid-id');
      await store.dispatch(fetchAction);
      const state = store.getState().pruningRequests;

      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Not found');
      expect(state.byId['invalid-id']).toBeUndefined();
    });
  });

  describe('fetchAdminPruningRequests thunk', () => {
    it('should handle pending state', async () => {
      const mockApi = pruningRequestsApi.getAdminPruningRequests as jest.Mock;
      mockApi.mockImplementation(() => new Promise(() => {})); // Never resolves

      const fetchAction = fetchAdminPruningRequests({ limit: 50 });
      store.dispatch(fetchAction);
      const state = store.getState().pruningRequests;

      expect(state.adminListLoading).toBe(true);
      expect(state.adminListError).toBeNull();
    });

    it('should handle fulfilled state with list', async () => {
      const mockRequests = [
        mockPruningRequest,
        { ...mockPruningRequest, id: 'pr-002', referenceCode: 'PR-2026-002' },
      ];
      const mockApi = pruningRequestsApi.getAdminPruningRequests as jest.Mock;
      mockApi.mockResolvedValue({
        success: true,
        data: mockRequests,
        meta: { total: 2, page: 1, limit: 50 },
      });

      const fetchAction = fetchAdminPruningRequests({ limit: 50 });
      await store.dispatch(fetchAction);
      const state = store.getState().pruningRequests;

      expect(state.adminListLoading).toBe(false);
      expect(state.adminList).toEqual(mockRequests);
      expect(state.byId['pr-001']).toEqual(mockPruningRequest);
      expect(state.adminListError).toBeNull();
    });

    it('should filter by status', async () => {
      const mockApi = pruningRequestsApi.getAdminPruningRequests as jest.Mock;
      mockApi.mockResolvedValue({
        success: true,
        data: [{ ...mockPruningRequest, status: 'submitted' as const }],
      });

      await store.dispatch(
        fetchAdminPruningRequests({ status: 'submitted', limit: 50 }),
      );

      expect(mockApi).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'submitted' }),
      );
    });

    it('should handle rejected state', async () => {
      const mockApi = pruningRequestsApi.getAdminPruningRequests as jest.Mock;
      mockApi.mockRejectedValue(new Error('Access denied'));

      const fetchAction = fetchAdminPruningRequests({ limit: 50 });
      await store.dispatch(fetchAction);
      const state = store.getState().pruningRequests;

      expect(state.adminListLoading).toBe(false);
      expect(state.adminListError?.error).toBe('Access denied');
      expect(state.adminList.length).toBe(0);
    });

    it('should handle empty admin list', async () => {
      const mockApi = pruningRequestsApi.getAdminPruningRequests as jest.Mock;
      mockApi.mockResolvedValue({
        success: true,
        data: [],
        meta: { total: 0, page: 1, limit: 50 },
      });

      const fetchAction = fetchAdminPruningRequests({ limit: 50 });
      await store.dispatch(fetchAction);
      const state = store.getState().pruningRequests;

      expect(state.adminList).toEqual([]);
      expect(state.adminListLoading).toBe(false);
    });
  });

  describe('reviewPruningRequest thunk', () => {
    it('should set reviewingId on pending', async () => {
      const mockApi = pruningRequestsApi.reviewPruningRequest as jest.Mock;
      mockApi.mockImplementation(() => new Promise(() => {})); // Never resolves

      store = configureStore({
        reducer: { pruningRequests: pruningRequestsReducer },
        preloadedState: {
          pruningRequests: {
            ...store.getState().pruningRequests,
            byId: { 'pr-001': mockPruningRequest },
            adminList: [mockPruningRequest],
          },
        },
      });

      const reviewAction = reviewPruningRequest({
        id: 'pr-001',
        decision: 'approve',
      });
      store.dispatch(reviewAction);
      const state = store.getState().pruningRequests;

      expect(state.reviewingId).toBe('pr-001');
    });

    it('should approve pruning request', async () => {
      const mockApi = pruningRequestsApi.reviewPruningRequest as jest.Mock;
      const approvedRequest = {
        ...mockPruningRequest,
        status: 'approved' as const,
      };
      mockApi.mockResolvedValue({
        success: true,
        data: approvedRequest,
      });

      store = configureStore({
        reducer: { pruningRequests: pruningRequestsReducer },
        preloadedState: {
          pruningRequests: {
            ...store.getState().pruningRequests,
            byId: { 'pr-001': mockPruningRequest },
            adminList: [mockPruningRequest],
          },
        },
      });

      const reviewAction = reviewPruningRequest({
        id: 'pr-001',
        decision: 'approve',
      });
      await store.dispatch(reviewAction);
      const state = store.getState().pruningRequests;

      expect(state.byId['pr-001'].status).toBe('approved');
      expect(state.reviewingId).toBeNull();
    });

    it('should reject pruning request with notes', async () => {
      const mockApi = pruningRequestsApi.reviewPruningRequest as jest.Mock;
      const rejectedRequest = {
        ...mockPruningRequest,
        status: 'rejected' as const,
        reviewNotes: 'Insufficient photos',
      };
      mockApi.mockResolvedValue({
        success: true,
        data: rejectedRequest,
      });

      store = configureStore({
        reducer: { pruningRequests: pruningRequestsReducer },
        preloadedState: {
          pruningRequests: {
            ...store.getState().pruningRequests,
            byId: { 'pr-001': mockPruningRequest },
            adminList: [mockPruningRequest],
          },
        },
      });

      const reviewAction = reviewPruningRequest({
        id: 'pr-001',
        decision: 'reject',
        reviewNotes: 'Insufficient photos',
      });
      await store.dispatch(reviewAction);
      const state = store.getState().pruningRequests;

      expect(state.byId['pr-001'].status).toBe('rejected');
      expect(mockApi).toHaveBeenCalledWith('pr-001', {
        decision: 'reject',
        reviewNotes: 'Insufficient photos',
      });
    });

    it('should handle review error', async () => {
      const mockApi = pruningRequestsApi.reviewPruningRequest as jest.Mock;
      mockApi.mockRejectedValue(new Error('Review failed'));

      store = configureStore({
        reducer: { pruningRequests: pruningRequestsReducer },
        preloadedState: {
          pruningRequests: {
            ...store.getState().pruningRequests,
            byId: { 'pr-001': mockPruningRequest },
            adminList: [mockPruningRequest],
          },
        },
      });

      const reviewAction = reviewPruningRequest({
        id: 'pr-001',
        decision: 'approve',
      });
      await store.dispatch(reviewAction);
      const state = store.getState().pruningRequests;

      expect(state.error).toBe('Review failed');
      expect(state.reviewingId).toBeNull();
      expect(state.byId['pr-001'].status).toBe('submitted');
    });

    it('should update adminList when reviewing', async () => {
      const mockApi = pruningRequestsApi.reviewPruningRequest as jest.Mock;
      const approvedRequest = {
        ...mockPruningRequest,
        status: 'approved' as const,
      };
      mockApi.mockResolvedValue({
        success: true,
        data: approvedRequest,
      });

      store = configureStore({
        reducer: { pruningRequests: pruningRequestsReducer },
        preloadedState: {
          pruningRequests: {
            ...store.getState().pruningRequests,
            byId: { 'pr-001': mockPruningRequest },
            adminList: [mockPruningRequest],
          },
        },
      });

      const reviewAction = reviewPruningRequest({
        id: 'pr-001',
        decision: 'approve',
      });
      await store.dispatch(reviewAction);
      const state = store.getState().pruningRequests;

      expect(state.adminList[0].status).toBe('approved');
    });
  });

  describe('convertPruningRequestToTask thunk', () => {
    it('should set convertingId on pending', async () => {
      const mockApi = pruningRequestsApi.convertPruningRequestToTask as jest.Mock;
      mockApi.mockImplementation(() => new Promise(() => {})); // Never resolves

      store = configureStore({
        reducer: { pruningRequests: pruningRequestsReducer },
        preloadedState: {
          pruningRequests: {
            ...store.getState().pruningRequests,
            byId: { 'pr-001': mockPruningRequest },
            adminList: [mockPruningRequest],
          },
        },
      });

      const convertAction = convertPruningRequestToTask({
        id: 'pr-001',
        areaId: 'area1',
        assignedTo: 'user1',
        scheduledDate: '2026-05-01',
        caseType: 'PT',
        pruningAction: 'PM',
        units: 1,
      });
      store.dispatch(convertAction);
      const state = store.getState().pruningRequests;

      expect(state.convertingId).toBe('pr-001');
    });

    it('should convert pruning request to task', async () => {
      const mockApi = pruningRequestsApi.convertPruningRequestToTask as jest.Mock;
      const convertedRequest = {
        ...mockPruningRequest,
        status: 'converted' as const,
      };
      mockApi.mockResolvedValue({
        success: true,
        data: convertedRequest,
      });

      store = configureStore({
        reducer: { pruningRequests: pruningRequestsReducer },
        preloadedState: {
          pruningRequests: {
            ...store.getState().pruningRequests,
            byId: { 'pr-001': mockPruningRequest },
            adminList: [mockPruningRequest],
          },
        },
      });

      const convertAction = convertPruningRequestToTask({
        id: 'pr-001',
        areaId: 'area1',
        assignedTo: 'user1',
        scheduledDate: '2026-05-01',
        caseType: 'PT',
        pruningAction: 'PM',
        units: 3,
      });
      await store.dispatch(convertAction);
      const state = store.getState().pruningRequests;

      expect(state.byId['pr-001'].status).toBe('converted');
      expect(state.convertingId).toBeNull();
    });

    it('should pass all conversion parameters to API', async () => {
      const mockApi = pruningRequestsApi.convertPruningRequestToTask as jest.Mock;
      mockApi.mockResolvedValue({
        success: true,
        data: mockPruningRequest,
      });

      store = configureStore({
        reducer: { pruningRequests: pruningRequestsReducer },
        preloadedState: {
          pruningRequests: {
            ...store.getState().pruningRequests,
            byId: { 'pr-001': mockPruningRequest },
            adminList: [mockPruningRequest],
          },
        },
      });

      const params = {
        id: 'pr-001',
        areaId: 'area2',
        assignedTo: 'user2',
        scheduledDate: '2026-06-15',
        caseType: 'GT' as const,
        pruningAction: 'PB' as const,
        units: 5,
      };

      const convertAction = convertPruningRequestToTask(params);
      await store.dispatch(convertAction);

      expect(mockApi).toHaveBeenCalledWith('pr-001', {
        areaId: 'area2',
        assignedTo: 'user2',
        scheduledDate: '2026-06-15',
        caseType: 'GT',
        pruningAction: 'PB',
        units: 5,
      });
    });

    it('should handle conversion error', async () => {
      const mockApi = pruningRequestsApi.convertPruningRequestToTask as jest.Mock;
      mockApi.mockRejectedValue(new Error('Capacity exceeded'));

      store = configureStore({
        reducer: { pruningRequests: pruningRequestsReducer },
        preloadedState: {
          pruningRequests: {
            ...store.getState().pruningRequests,
            byId: { 'pr-001': mockPruningRequest },
            adminList: [mockPruningRequest],
          },
        },
      });

      const convertAction = convertPruningRequestToTask({
        id: 'pr-001',
        areaId: 'area1',
        assignedTo: 'user1',
        scheduledDate: '2026-05-01',
        caseType: 'PT',
        pruningAction: 'PM',
        units: 1,
      });
      await store.dispatch(convertAction);
      const state = store.getState().pruningRequests;

      expect(state.error).toBe('Capacity exceeded');
      expect(state.convertingId).toBeNull();
      expect(state.byId['pr-001'].status).toBe('submitted');
    });

    it('should update adminList when converting', async () => {
      const mockApi = pruningRequestsApi.convertPruningRequestToTask as jest.Mock;
      const convertedRequest = {
        ...mockPruningRequest,
        status: 'converted' as const,
      };
      mockApi.mockResolvedValue({
        success: true,
        data: convertedRequest,
      });

      store = configureStore({
        reducer: { pruningRequests: pruningRequestsReducer },
        preloadedState: {
          pruningRequests: {
            ...store.getState().pruningRequests,
            byId: { 'pr-001': mockPruningRequest },
            adminList: [mockPruningRequest],
          },
        },
      });

      const convertAction = convertPruningRequestToTask({
        id: 'pr-001',
        areaId: 'area1',
        assignedTo: 'user1',
        scheduledDate: '2026-05-01',
        caseType: 'PT',
        pruningAction: 'PM',
        units: 1,
      });
      await store.dispatch(convertAction);
      const state = store.getState().pruningRequests;

      expect(state.adminList[0].status).toBe('converted');
    });
  });
});
