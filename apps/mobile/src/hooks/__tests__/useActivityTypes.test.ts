/**
 * useActivityTypes Hook Tests
 * Phase 2C: role-filtered activity types
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { useActivityTypes } from '../useActivityTypes';
import { getMyActivityTypes } from '../../services/api/activityTypesApi';
import type { ActivityType } from '../../types/models.types';

jest.mock('../../services/api/activityTypesApi', () => ({
  getMyActivityTypes: jest.fn(),
}));

const mockGetMyActivityTypes = getMyActivityTypes as jest.MockedFunction<
  typeof getMyActivityTypes
>;

describe('useActivityTypes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch activity types on mount', async () => {
    const mockTypes: ActivityType[] = [
      {
        id: 'type-1',
        name: 'Penyiraman',
        code: 'spray',
        applicable_roles: ['satgas'] as const,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'type-2',
        name: 'Pemotongan Rumput',
        code: 'cut_grass',
        applicable_roles: ['satgas'] as const,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
      },
    ];
    mockGetMyActivityTypes.mockResolvedValue({
      data: { data: mockTypes },
    });

    const { result } = renderHook(() => useActivityTypes());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activityTypes).toEqual(mockTypes);
    expect(result.current.error).toBeNull();
  });

  it('should handle API error response', async () => {
    mockGetMyActivityTypes.mockResolvedValue({
      error: 'Unauthorized',
    });

    const { result } = renderHook(() => useActivityTypes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Unauthorized');
    expect(result.current.activityTypes).toEqual([]);
  });

  it('should handle exception', async () => {
    mockGetMyActivityTypes.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useActivityTypes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Gagal memuat jenis aktivitas');
    expect(result.current.activityTypes).toEqual([]);
  });

  it('should handle empty response', async () => {
    mockGetMyActivityTypes.mockResolvedValue({
      data: { data: [] },
    });

    const { result } = renderHook(() => useActivityTypes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activityTypes).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should provide refetch function', async () => {
    const mockTypes: ActivityType[] = [
      {
        id: 'type-1',
        name: 'Penyiraman',
        code: 'spray',
        applicable_roles: ['satgas'] as const,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
      },
    ];
    mockGetMyActivityTypes.mockResolvedValue({
      data: { data: mockTypes },
    });

    const { result } = renderHook(() => useActivityTypes());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
    expect(mockGetMyActivityTypes).toHaveBeenCalledTimes(1);
  });
});
