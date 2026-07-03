/**
 * Unit Tests: Assets API — pagination safety
 * Ensures a "load all assets" fetch (e.g. the QR page) walks every page instead
 * of trusting one capped request.
 */

import MockAdapter from 'axios-mock-adapter';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '../client';
import { useAssets } from '../assets';
import { ReactNode } from 'react';

describe('Assets API pagination', () => {
  let mockAxios: MockAdapter;
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    Wrapper.displayName = 'TestWrapper';
    return Wrapper;
  };

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });
  afterEach(() => {
    mockAxios.restore();
    queryClient?.clear();
  });

  it('walks every page so no assets are dropped past the cap', async () => {
    mockAxios.onGet('/assets?page=1&limit=1000').reply(200, {
      data: [{ id: 'a1', name: 'Asset 1' }],
      meta: { total: 2, page: 1, limit: 1000, totalPages: 2 },
    });
    mockAxios.onGet('/assets?page=2&limit=1000').reply(200, {
      data: [{ id: 'a2', name: 'Asset 2' }],
      meta: { total: 2, page: 2, limit: 1000, totalPages: 2 },
    });

    const { result } = renderHook(() => useAssets({ limit: 1000 }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(2);
    expect(result.current.data?.data.map((a) => a.id)).toEqual(['a1', 'a2']);
  });

  it('returns a single explicit page unchanged', async () => {
    mockAxios.onGet('/assets?page=2&limit=20').reply(200, {
      data: [{ id: 'a3', name: 'Asset 3' }],
      meta: { total: 41, page: 2, limit: 20, totalPages: 3 },
    });

    const { result } = renderHook(() => useAssets({ page: 2, limit: 20 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.meta.page).toBe(2);
    expect(result.current.data?.data).toHaveLength(1);
  });
});
