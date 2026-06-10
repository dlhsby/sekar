/**
 * Unit Tests: Pruning Requests admin hooks (Phase 3 sub-phase 3-10 web)
 *
 * Audit H6 (2026-05-23): the `pruning-requests` web API client was below
 * the 80 % gate. Covers the list / detail / review / assign-to-task hooks
 * including their cache-invalidation side effects.
 */

import MockAdapter from 'axios-mock-adapter';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { apiClient } from '../client';
import {
  usePruningRequest,
  usePruningRequests,
  useReviewPruningRequest,
  useConvertPruningRequestToTask,
  type PruningRequest,
} from '../pruning-requests';

describe('Pruning Requests API (admin web)', () => {
  let mockAxios: MockAdapter;
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    Wrapper.displayName = 'TestWrapper';
    return Wrapper;
  };

  const mockRequest = (overrides: Partial<PruningRequest> = {}): PruningRequest =>
    ({
      id: 'pr-1',
      referenceCode: '25PR000001',
      submittedBy: 'u-1',
      submitter: { id: 'u-1', full_name: 'Staff Kecamatan', role: 'staff_kecamatan' },
      kecamatanName: 'Wiyung',
      rayonId: 'r-1',
      rayon: { id: 'r-1', name: 'Rayon Selatan' },
      address: 'Jl. Test',
      gpsLat: -7.29,
      gpsLng: 112.74,
      expectedDate: null,
      expectedYear: 2026,
      expectedIsoWeek: 22,
      estimatedPlantCount: 3,
      treeCount: 3,
      treeHeightEstimate: '5m',
      treeDiameterEstimate: '30cm',
      requesterName: 'Pak Budi',
      requesterPhone: '081200000000',
      rtLeaderName: null,
      rtLeaderPhone: null,
      photoUrls: ['photo.jpg'],
      notes: null,
      status: 'submitted',
      reviewedBy: null,
      reviewer: null,
      reviewedAt: null,
      reviewNotes: null,
      assignedTaskId: null,
      createdAt: '2026-05-23T08:00:00Z',
      updatedAt: '2026-05-23T08:00:00Z',
      ...overrides,
    }) as PruningRequest;

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('usePruningRequests', () => {
    it('always forwards admin=true and threads filter params through', async () => {
      // Backend returns the raw `{ items, total, page, limit }` shape; the hook
      // normalises it to the `{ data, meta }` envelope consumers expect.
      const raw = { items: [mockRequest()], total: 1, page: 1, limit: 10 };
      mockAxios.onGet('/pruning-requests').reply((config) => {
        expect(config.params).toMatchObject({
          admin: true,
          status: 'submitted',
          rayon_id: 'r-1',
        });
        return [200, raw];
      });

      const { result } = renderHook(
        () => usePruningRequests({ status: 'submitted', rayon_id: 'r-1' }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data).toHaveLength(1);
      expect(result.current.data?.meta.total).toBe(1);
    });

    it('still works with no filters', async () => {
      mockAxios.onGet('/pruning-requests').reply(200, {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      const { result } = renderHook(() => usePruningRequests(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.data).toHaveLength(0);
    });
  });

  describe('usePruningRequest', () => {
    it('is disabled when id is falsy', () => {
      const { result } = renderHook(() => usePruningRequest(''), {
        wrapper: createWrapper(),
      });
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches by id', async () => {
      mockAxios.onGet('/pruning-requests/pr-1').reply(200, mockRequest());

      const { result } = renderHook(() => usePruningRequest('pr-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.id).toBe('pr-1');
    });
  });

  describe('useReviewPruningRequest', () => {
    it('POSTs the review decision and invalidates the cache on success', async () => {
      const approved = mockRequest({ status: 'approved' });
      mockAxios.onPost('/pruning-requests/pr-1/review').reply((config) => {
        expect(JSON.parse(config.data)).toEqual({
          decision: 'approve',
          reviewNotes: 'Looks good',
        });
        return [200, approved];
      });

      const wrapper = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useReviewPruningRequest('pr-1'), {
        wrapper,
      });

      result.current.mutate({ decision: 'approve', reviewNotes: 'Looks good' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.status).toBe('approved');
      // Detail + lists should both be invalidated.
      const queryKeys = invalidateSpy.mock.calls.map((c) => (c[0] as any).queryKey);
      expect(queryKeys).toContainEqual(['pruning-requests', 'detail', 'pr-1']);
      expect(queryKeys).toContainEqual(['pruning-requests', 'list']);
    });

    it('reports mutation errors', async () => {
      mockAxios.onPost('/pruning-requests/pr-1/review').reply(409, {
        success: false,
        error: 'Already reviewed',
      });

      const { result } = renderHook(() => useReviewPruningRequest('pr-1'), {
        wrapper: createWrapper(),
      });

      result.current.mutate({ decision: 'approve' });
      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  describe('useConvertPruningRequestToTask', () => {
    it('POSTs assign-to-task and invalidates detail + list', async () => {
      const assigned = mockRequest({ status: 'assigned', assignedTaskId: 't-1' });
      mockAxios.onPost('/pruning-requests/pr-1/assign-to-task').reply((config) => {
        expect(JSON.parse(config.data)).toMatchObject({
          areaId: 'a-1',
          assignedTo: 'u-2',
          caseType: 'GT',
          pruningAction: 'PM',
          scheduledDate: '2026-05-25',
          units: 1,
        });
        return [200, { request: assigned, task: { id: 't-1' } }];
      });

      const wrapper = createWrapper();
      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () => useConvertPruningRequestToTask('pr-1'),
        { wrapper },
      );

      result.current.mutate({
        areaId: 'a-1',
        assignedTo: 'u-2',
        caseType: 'GT',
        pruningAction: 'PM',
        scheduledDate: '2026-05-25',
        units: 1,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data?.request.status).toBe('assigned');
      expect(result.current.data?.task.id).toBe('t-1');
      const queryKeys = invalidateSpy.mock.calls.map((c) => (c[0] as any).queryKey);
      expect(queryKeys).toContainEqual(['pruning-requests', 'detail', 'pr-1']);
      expect(queryKeys).toContainEqual(['pruning-requests', 'list']);
    });

    it('works with the auto-pick date path (no scheduledDate)', async () => {
      mockAxios.onPost('/pruning-requests/pr-1/assign-to-task').reply((config) => {
        const parsed = JSON.parse(config.data);
        expect(parsed.scheduledDate).toBeUndefined();
        expect(parsed.assignedTo).toBe('u-2');
        return [200, { request: mockRequest({ status: 'assigned' }), task: { id: 't-1' } }];
      });

      const { result } = renderHook(
        () => useConvertPruningRequestToTask('pr-1'),
        { wrapper: createWrapper() },
      );

      result.current.mutate({
        areaId: 'a-1',
        assignedTo: 'u-2',
        caseType: 'GT',
        pruningAction: 'PM',
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });
});
