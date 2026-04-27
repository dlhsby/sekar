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
});
