/**
 * Unit Tests: Shift Definitions API
 * Tests shift definitions data fetching
 */

import MockAdapter from 'axios-mock-adapter';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '../client';
import { shiftDefinitionKeys, useShiftDefinitions, useShiftDefinition } from '../shift-definitions';
import type { ShiftDefinition } from '@/types/models';
import { ReactNode } from 'react';

describe('Shift Definitions API', () => {
  let mockAxios: MockAdapter;
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  const mockShiftDefinitions: ShiftDefinition[] = [
    {
      id: '1',
      name: 'Pagi',
      start_time: '06:00',
      end_time: '14:00',
      color: '#4CAF50',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: 'Siang',
      start_time: '14:00',
      end_time: '22:00',
      color: '#FF9800',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: '3',
      name: 'Malam',
      start_time: '22:00',
      end_time: '06:00',
      color: '#2196F3',
      created_at: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    mockAxios = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mockAxios.restore();
    queryClient?.clear();
  });

  describe('shiftDefinitionKeys', () => {
    it('should generate correct query keys', () => {
      expect(shiftDefinitionKeys.all).toEqual(['shift-definitions']);
      expect(shiftDefinitionKeys.lists()).toEqual(['shift-definitions', 'list']);
      expect(shiftDefinitionKeys.list()).toEqual(['shift-definitions', 'list']);
      expect(shiftDefinitionKeys.details()).toEqual(['shift-definitions', 'detail']);
      expect(shiftDefinitionKeys.detail('1')).toEqual(['shift-definitions', 'detail', '1']);
    });
  });

  describe('useShiftDefinitions', () => {
    it('should fetch all shift definitions', async () => {
      mockAxios.onGet('/shift-definitions').reply(200, mockShiftDefinitions);

      const { result } = renderHook(() => useShiftDefinitions(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toHaveLength(3);
      expect(result.current.data?.[0].name).toBe('Pagi');
      expect(result.current.data?.[1].name).toBe('Siang');
      expect(result.current.data?.[2].name).toBe('Malam');
    });

    it('should handle fetch error', async () => {
      mockAxios.onGet('/shift-definitions').reply(500, {
        statusCode: 500,
        message: 'Internal server error',
      });

      const { result } = renderHook(() => useShiftDefinitions(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('useShiftDefinition', () => {
    const mockShift = mockShiftDefinitions[0];

    it('should fetch single shift definition by ID', async () => {
      mockAxios.onGet('/shift-definitions/1').reply(200, mockShift);

      const { result } = renderHook(() => useShiftDefinition('1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.name).toBe('Pagi');
      expect(result.current.data?.start_time).toBe('06:00');
      expect(result.current.data?.end_time).toBe('14:00');
      expect(result.current.data?.color).toBe('#4CAF50');
    });

    it('should handle shift not found', async () => {
      mockAxios.onGet('/shift-definitions/999').reply(404, {
        statusCode: 404,
        message: 'Shift definition not found',
      });

      const { result } = renderHook(() => useShiftDefinition('999'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useShiftDefinition(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFetching).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });
});
