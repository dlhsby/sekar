/**
 * useTodayRoster — the "am I scheduled today?" signal shared by the clock-in
 * screen and the home Kehadiran hero. If those two disagree the worker sees one
 * shift on the home card and clocks into another, which is the bug class this
 * hook was extracted to prevent.
 *
 * Two behaviours are load-bearing and easy to regress:
 *  - the two fetches degrade INDEPENDENTLY (a failing day-list must not blank
 *    the card that the single operative row can still fill), and
 *  - `refetch` exists at all — the roster used to be fetched once on mount, so a
 *    Home tab left open across midnight showed yesterday's shift.
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useTodayRoster } from '../useTodayRoster';
import { getMyDay, getMyRoster } from '../../services/api/schedulesApi';

jest.mock('../../services/api/schedulesApi', () => ({
  getMyRoster: jest.fn(),
  getMyDay: jest.fn(),
}));

const mockRoster = getMyRoster as jest.Mock;
const mockDay = getMyDay as jest.Mock;

const SHIFT = { id: 's1', name: 'Shift 1', start_time: '06:00:00', end_time: '15:00:00' };
const row = (over: Record<string, unknown> = {}) => ({
  id: 'r1',
  user_id: 'u1',
  schedule_date: '2026-07-27',
  status: 'planned',
  shift_definition: SHIFT,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockRoster.mockResolvedValue({ data: null });
  mockDay.mockResolvedValue({ data: [] });
});

describe('useTodayRoster', () => {
  it('reports an unscheduled worker rather than failing', async () => {
    const { result } = renderHook(() => useTodayRoster());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.roster).toBeNull();
    expect(result.current.rosterShift).toBeNull();
    expect(result.current.hasScheduleToday).toBe(false);
    expect(result.current.allToday).toEqual([]);
  });

  it('exposes the operative row and its shift', async () => {
    mockRoster.mockResolvedValue({ data: row() });
    const { result } = renderHook(() => useTodayRoster());
    await waitFor(() => expect(result.current.hasScheduleToday).toBe(true));

    expect(result.current.rosterShift).toEqual(SHIFT);
  });

  it('returns EVERY row for the day — a worker can cover several places (ADR-053)', async () => {
    mockRoster.mockResolvedValue({ data: row({ id: 'a' }) });
    mockDay.mockResolvedValue({ data: [row({ id: 'a' }), row({ id: 'b' })] });
    const { result } = renderHook(() => useTodayRoster());
    await waitFor(() => expect(result.current.allToday).toHaveLength(2));
  });

  it('falls back to the single operative row when the day list fails', async () => {
    // Supplementary data must never blank a card the operative row can fill.
    mockRoster.mockResolvedValue({ data: row({ id: 'a' }) });
    mockDay.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useTodayRoster());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.allToday).toEqual([expect.objectContaining({ id: 'a' })]);
  });

  it('treats a failed roster fetch as unscheduled instead of throwing', async () => {
    mockRoster.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useTodayRoster());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasScheduleToday).toBe(false);
  });

  it('refetches on demand — the fix for a Home tab left open past midnight', async () => {
    mockRoster.mockResolvedValue({ data: null });
    const { result } = renderHook(() => useTodayRoster());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasScheduleToday).toBe(false);

    // A new day's roster lands; the hook must pick it up without a remount.
    mockRoster.mockResolvedValue({ data: row({ schedule_date: '2026-07-28' }) });
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.hasScheduleToday).toBe(true);
    expect(mockRoster).toHaveBeenCalledTimes(2);
  });

  it('carries the presence axes through (ADR-050)', async () => {
    // The card colours from these; dropping them silently degrades every reading
    // to planned/present/absent.
    mockRoster.mockResolvedValue({
      data: row({ status: 'present', lifecycle_state: 'bertugas', is_within_area: false }),
    });
    const { result } = renderHook(() => useTodayRoster());
    await waitFor(() => expect(result.current.roster).not.toBeNull());

    expect(result.current.roster?.lifecycle_state).toBe('bertugas');
    expect(result.current.roster?.is_within_area).toBe(false);
  });
});
