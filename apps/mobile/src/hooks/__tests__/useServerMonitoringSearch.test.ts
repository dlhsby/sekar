/**
 * Tests for useServerMonitoringSearch — the hybrid petugas search hook.
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useServerMonitoringSearch } from '../useServerMonitoringSearch';
import { searchMonitoring } from '../../services/api/monitoringApi';

jest.mock('../../services/api/monitoringApi', () => ({
  searchMonitoring: jest.fn(),
}));

const mockSearch = searchMonitoring as jest.MockedFunction<typeof searchMonitoring>;

describe('useServerMonitoringSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSearch.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stays idle (no request) for a query shorter than 2 chars', () => {
    const { result } = renderHook(() => useServerMonitoringSearch('a'));
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(mockSearch).not.toHaveBeenCalled();
    expect(result.current.users).toBeNull();
    expect(result.current.isOffline).toBe(false);
  });

  it('returns server users when online', async () => {
    mockSearch.mockResolvedValue({
      data: { users: [{ id: 'u1', full_name: 'Andi' }] },
    } as any);

    const { result } = renderHook(() => useServerMonitoringSearch('an'));
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(result.current.isSearching).toBe(false));
    expect(mockSearch).toHaveBeenCalledWith('an');
    expect(result.current.users?.map((u) => u.id)).toEqual(['u1']);
    expect(result.current.isOffline).toBe(false);
  });

  it('falls back (users=null) and flags offline when the request errors', async () => {
    mockSearch.mockResolvedValue({ error: 'Network error' } as any);

    const { result } = renderHook(() => useServerMonitoringSearch('an'));
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(result.current.isOffline).toBe(true));
    expect(result.current.users).toBeNull();
  });

  it('debounces — only the final query fires a request', async () => {
    mockSearch.mockResolvedValue({ data: { users: [] } } as any);

    const { rerender } = renderHook(
      ({ q }: { q: string }) => useServerMonitoringSearch(q),
      { initialProps: { q: 'an' } },
    );
    rerender({ q: 'and' });
    rerender({ q: 'andi' });
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(mockSearch).toHaveBeenCalledTimes(1));
    expect(mockSearch).toHaveBeenCalledWith('andi');
  });
});
