/**
 * useCurrentShiftState
 *
 * The worker's live attendance state from `GET /shifts/current-state` (ADR-055):
 * the ranked shift options a punch could attribute to *now* (best-first,
 * `is_default` flags the top) and the open session, if any.
 *
 * This is the SAME source the Clock-In/Out screen uses to decide "which shift".
 * The Home Kehadiran card and the Kehadiran hub consume it too, so all three
 * agree on today's shift instead of the Home card drifting to a stale/other
 * shift (it used to read only `/schedules/my`, fetched once and never refreshed).
 *
 * Navigation-agnostic on purpose: it fetches on mount and exposes `refetch`, so
 * each screen re-runs it on focus / pull-to-refresh from its own navigation
 * context (keeping the hook unit-testable without a NavigationContainer).
 */
import { useState, useCallback, useEffect } from 'react';
import { getCurrentState } from '../services/api/shiftsApi';
import { useAppSelector } from '../store/hooks';
import { pickDisplayShift, type DisplayShift } from '../utils/shiftDisplay';
import type { ShiftDefinition } from '../types/models.types';
import type { ShiftOption, OpenSessionInfo } from '../types/api.types';

export interface CurrentShiftState {
  /** Ranked attribution options (best-first); empty when none is in window. */
  options: ShiftOption[];
  /** The open session, or null; undefined until the first fetch resolves. */
  openSession: OpenSessionInfo | null | undefined;
  /** Whether a session is currently open (null before the first fetch). */
  hasOpenSession: boolean | null;
  loading: boolean;
  /** Re-fetch the live state (call on focus / pull-to-refresh). */
  refetch: () => Promise<void>;
  /**
   * The single shift to display, attribution-first with a roster fallback (see
   * `pickDisplayShift`). Pass today's roster shift for the fallback.
   */
  displayShift: (rosterShift: ShiftDefinition | null | undefined) => DisplayShift | null;
}

export function useCurrentShiftState(): CurrentShiftState {
  const isOnline = useAppSelector((state) => state.offline.isOnline);
  const [options, setOptions] = useState<ShiftOption[]>([]);
  const [openSession, setOpenSession] = useState<OpenSessionInfo | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    // Offline: the attribution endpoint is unreachable; keep whatever we have and
    // let the caller fall back to the roster shift / local state.
    if (!isOnline) {
      setLoading(false);
      return;
    }
    try {
      const res = await getCurrentState();
      if (res.data) {
        setOptions(res.data.options ?? []);
        setOpenSession(res.data.open_session ?? null);
      }
    } catch {
      // Non-fatal — the surfaces degrade to the roster shift / local shift state.
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const displayShift = useCallback(
    (rosterShift: ShiftDefinition | null | undefined) => pickDisplayShift(options, rosterShift),
    [options],
  );

  return {
    options,
    openSession,
    hasOpenSession: openSession === undefined ? null : openSession != null,
    loading,
    refetch,
    displayShift,
  };
}
