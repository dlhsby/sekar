/**
 * Unit Tests: Activity Types API
 * Tests activity type fetching operations (Phase 2C)
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MockAdapter from 'axios-mock-adapter';
import { ReactNode } from 'react';
import { apiClient } from '../client';
import { activityTypeKeys, useActivityTypes } from '../activity-types';
import type { ActivityType, UserRole } from '@/types/models';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
}

describe('Activity Types API', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  const mockActivityTypes: ActivityType[] = [
    {
      id: 'type-1',
      code: 'SWEEPING',
      name: 'Penyapuan',
      description: 'Kegiatan penyapuan area',
      applicable_roles: ['satgas', 'linmas'],
      is_active: true,
      created_at: '2026-02-16T00:00:00Z',
      updated_at: '2026-02-16T00:00:00Z',
    },
    {
      id: 'type-2',
      code: 'PLANTING',
      name: 'Penanaman',
      description: 'Kegiatan penanaman pohon',
      applicable_roles: ['satgas'],
      is_active: true,
      created_at: '2026-02-16T00:00:00Z',
      updated_at: '2026-02-16T00:00:00Z',
    },
    {
      id: 'type-3',
      code: 'PATROL',
      name: 'Patroli',
      description: 'Kegiatan patroli area',
      applicable_roles: ['linmas'],
      is_active: true,
      created_at: '2026-02-16T00:00:00Z',
      updated_at: '2026-02-16T00:00:00Z',
    },
  ];

  describe('GET /activity-types', () => {
    it('should fetch all activity types without filter', async () => {
      mock.onGet('/activity-types').reply(200, mockActivityTypes);

      const response = await apiClient.get<ActivityType[]>('/activity-types');

      expect(response.data).toHaveLength(3);
      expect(response.data[0].code).toBe('SWEEPING');
      expect(response.data[0].applicable_roles).toContain('satgas');
    });

    it('should fetch activity types filtered by satgas role', async () => {
      const satgasTypes = mockActivityTypes.filter((t) => t.applicable_roles.includes('satgas'));

      mock.onGet('/activity-types', { params: { role: 'satgas' } }).reply(200, satgasTypes);

      const response = await apiClient.get<ActivityType[]>('/activity-types', {
        params: { role: 'satgas' as UserRole },
      });

      expect(response.data).toHaveLength(2);
      expect(response.data.every((t) => t.applicable_roles.includes('satgas'))).toBe(true);
    });

    it('should fetch activity types filtered by linmas role', async () => {
      const linmasTypes = mockActivityTypes.filter((t) => t.applicable_roles.includes('linmas'));

      mock.onGet('/activity-types', { params: { role: 'linmas' } }).reply(200, linmasTypes);

      const response = await apiClient.get<ActivityType[]>('/activity-types', {
        params: { role: 'linmas' as UserRole },
      });

      expect(response.data).toHaveLength(2);
      expect(response.data.every((t) => t.applicable_roles.includes('linmas'))).toBe(true);
    });

    it('should handle empty activity types list', async () => {
      mock.onGet('/activity-types').reply(200, []);

      const response = await apiClient.get<ActivityType[]>('/activity-types');

      expect(response.data).toHaveLength(0);
    });

    it('should validate activity type structure', async () => {
      mock.onGet('/activity-types').reply(200, mockActivityTypes);

      const response = await apiClient.get<ActivityType[]>('/activity-types');

      const activityType = response.data[0];
      expect(activityType).toHaveProperty('id');
      expect(activityType).toHaveProperty('code');
      expect(activityType).toHaveProperty('name');
      expect(activityType).toHaveProperty('applicable_roles');
      expect(activityType).toHaveProperty('is_active');
      expect(Array.isArray(activityType.applicable_roles)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle server error', async () => {
      mock.onGet('/activity-types').reply(500, {
        statusCode: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
      });

      await expect(apiClient.get('/activity-types')).rejects.toThrow();
    });

    it('should handle network error', async () => {
      mock.onGet('/activity-types').networkError();

      await expect(apiClient.get('/activity-types')).rejects.toThrow();
    });

    it('should handle invalid role parameter', async () => {
      mock.onGet('/activity-types', { params: { role: 'invalid_role' } }).reply(400, {
        statusCode: 400,
        message: 'Invalid role parameter',
        error: 'BadRequest',
      });

      await expect(
        apiClient.get('/activity-types', { params: { role: 'invalid_role' } })
      ).rejects.toThrow();
    });
  });
});

describe('activityTypeKeys', () => {
  it('returns stable all key', () => {
    expect(activityTypeKeys.all).toEqual(['activity-types']);
  });

  it('returns list key without role', () => {
    expect(activityTypeKeys.list(undefined)).toEqual(['activity-types', 'list', undefined]);
  });

  it('returns list key with role', () => {
    expect(activityTypeKeys.list('satgas' as UserRole)).toEqual([
      'activity-types',
      'list',
      'satgas',
    ]);
  });
});

describe('useActivityTypes hook', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  const mockTypes: ActivityType[] = [
    {
      id: '1',
      code: 'SWEEP',
      name: 'Penyapuan',
      description: undefined,
      applicable_roles: ['satgas'],
      is_active: true,
      created_at: '2026-02-16T00:00:00Z',
      updated_at: '2026-02-16T00:00:00Z',
    },
  ];

  it('fetches all activity types without role', async () => {
    mock.onGet('/activity-types').reply(200, mockTypes);

    const { result } = renderHook(() => useActivityTypes(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockTypes);
  });

  it('fetches activity types filtered by role', async () => {
    mock.onGet('/activity-types').reply(200, mockTypes);

    const { result } = renderHook(() => useActivityTypes('satgas' as UserRole), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockTypes);
  });

  it('returns loading state initially', () => {
    mock.onGet('/activity-types').reply(() => new Promise(() => {}));

    const { result } = renderHook(() => useActivityTypes(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
  });

  it('returns error state on API failure', async () => {
    mock.onGet('/activity-types').reply(500);

    const { result } = renderHook(() => useActivityTypes(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
