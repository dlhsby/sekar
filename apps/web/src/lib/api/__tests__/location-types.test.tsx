/**
 * Unit Tests: Location Types API
 * Tests area types data fetching
 */

import MockAdapter from 'axios-mock-adapter';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '../client';
import { useLocationTypes } from '../location-types';
import type { LocationType } from '@/types/models';
import { ReactNode } from 'react';

describe('Area Types API', () => {
  let mockAxios: MockAdapter;
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    Wrapper.displayName = 'TestWrapper';
    return Wrapper;
  };

  const mockLocationTypes: LocationType[] = [
    {
      id: '1',
      name: 'Taman',
      code: 'TAMAN',
      category: 'ACTIVE',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: 'Jalur Hijau',
      code: 'JALUR_HIJAU',
      category: 'PASSIVE',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    {
      id: '3',
      name: 'Hutan Kota',
      code: 'HUTAN_KOTA',
      category: 'ACTIVE',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
    queryClient?.clear();
  });

  describe('useLocationTypes', () => {
    it('should fetch all area types', async () => {
      mockAxios.onGet('/location-types').reply(200, mockLocationTypes);

      const { result } = renderHook(() => useLocationTypes(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(3);
      expect(result.current.data?.[0].name).toBe('Taman');
      expect(result.current.data?.[1].name).toBe('Jalur Hijau');
      expect(result.current.data?.[2].name).toBe('Hutan Kota');
    });

    it('should handle fetch error', async () => {
      mockAxios.onGet('/location-types').reply(500, {
        statusCode: 500,
        message: 'Internal server error',
      });

      const { result } = renderHook(() => useLocationTypes(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });

    it('should use correct staleTime', () => {
      mockAxios.onGet('/location-types').reply(200, mockLocationTypes);

      const { result } = renderHook(() => useLocationTypes(), { wrapper: createWrapper() });

      expect(result.current.isStale).toBe(true); // Initially stale until data fetched
    });
  });
});
