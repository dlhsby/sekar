/**
 * useCurrentShiftState — the ADR-055 attribution state behind the clock-in shift
 * picker and the shift named on the home / Kehadiran cards.
 *
 * This hook exists because those surfaces used to disagree: home showed "Shift 2"
 * while clock-in and the web board showed "Shift 1". The contract that keeps them
 * aligned is `displayShift`: server attribution first, roster only as a fallback.
 *
 * The offline path matters just as much — a worker in a park with no signal must
 * still get a usable screen rather than an empty one.
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useCurrentShiftState } from '../useCurrentShiftState';
import { getCurrentState } from '../../services/api/shiftsApi';
import { useAppSelector } from '../../store/hooks';

jest.mock('../../services/api/shiftsApi', () => ({ getCurrentState: jest.fn() }));
jest.mock('../../store/hooks', () => ({ useAppSelector: jest.fn() }));

const mockState = getCurrentState as jest.Mock;
const mockSelector = useAppSelector as unknown as jest.Mock;

// `shift_name`, not `name` — the API's ShiftOption shape (pickDisplayShift
// reads `shift_name`, so a `name` fixture silently yields an empty label).
const opt = (over: Record<string, unknown> = {}) => ({
  shift_definition_id: 's1',
  shift_name: 'Shift 1',
  start_time: '06:00:00',
  end_time: '15:00:00',
  crosses_midnight: false,
  is_default: false,
  ...over,
});
const ROSTER_SHIFT = {
  id: 's9',
  name: 'Shift 9',
  start_time: '09:00:00',
  end_time: '17:00:00',
} as never;

/** `useAppSelector(state => state.offline.isOnline)` — feed it a shaped state. */
const setOnline = (isOnline: boolean) =>
  mockSelector.mockImplementation((sel: (s: unknown) => unknown) => sel({ offline: { isOnline } }));

beforeEach(() => {
  jest.clearAllMocks();
  setOnline(true);
  mockState.mockResolvedValue({ data: { options: [], open_session: null } });
});

describe('useCurrentShiftState', () => {
  it('loads attribution options and resolves the open session', async () => {
    mockState.mockResolvedValue({
      data: { options: [opt({ is_default: true })], open_session: { shift_definition_id: 's1' } },
    });
    const { result } = renderHook(() => useCurrentShiftState());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.options).toHaveLength(1);
    expect(result.current.hasOpenSession).toBe(true);
  });

  it('distinguishes "no open session" from "not yet known"', async () => {
    // null = still unknown (never answered); false = answered, nothing open.
    // Collapsing them makes the clock button flicker into the wrong mode.
    mockState.mockResolvedValue({ data: { options: [], open_session: null } });
    const { result } = renderHook(() => useCurrentShiftState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasOpenSession).toBe(false);
  });

  it('prefers the server attribution over the roster shift', async () => {
    // The actual home-vs-clock-in disagreement: attribution wins, so every
    // surface names the same shift.
    mockState.mockResolvedValue({
      data: { options: [opt({ is_default: true })], open_session: null },
    });
    const { result } = renderHook(() => useCurrentShiftState());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.displayShift(ROSTER_SHIFT)?.name).toBe('Shift 1');
  });

  it('falls back to the roster shift when attribution offers nothing', async () => {
    const { result } = renderHook(() => useCurrentShiftState());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.displayShift(ROSTER_SHIFT)?.name).toBe('Shift 9');
  });

  it('returns null when neither attribution nor roster names a shift', async () => {
    const { result } = renderHook(() => useCurrentShiftState());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.displayShift(null)).toBeNull();
  });

  describe('offline', () => {
    it('never calls the endpoint and still finishes loading', async () => {
      setOnline(false);
      const { result } = renderHook(() => useCurrentShiftState());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockState).not.toHaveBeenCalled();
      // Screens degrade to the roster shift rather than showing nothing.
      expect(result.current.displayShift(ROSTER_SHIFT)?.name).toBe('Shift 9');
    });

    it('treats a failed request as non-fatal', async () => {
      mockState.mockRejectedValue(new Error('timeout'));
      const { result } = renderHook(() => useCurrentShiftState());
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.options).toEqual([]);
      expect(result.current.displayShift(ROSTER_SHIFT)?.name).toBe('Shift 9');
    });
  });

  it('refetches on demand, picking up a newly opened session', async () => {
    const { result } = renderHook(() => useCurrentShiftState());
    await waitFor(() => expect(result.current.hasOpenSession).toBe(false));

    mockState.mockResolvedValue({
      data: { options: [opt()], open_session: { shift_definition_id: 's1' } },
    });
    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.hasOpenSession).toBe(true);
  });
});
