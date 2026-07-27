/**
 * useTodayRoster Hook
 *
 * Fetches the authenticated worker's roster row for today (WIB) — the single
 * schedule concept (ADR-013). This is the authoritative "am I scheduled today?"
 * signal shared by the clock-in screen and the home "Kehadiran saya" hero, so
 * both agree on lateness / area semantics. An unscheduled worker (patrol /
 * ad-hoc) resolves to `hasScheduleToday === false` with a null roster shift.
 */

import { useState, useEffect, useCallback } from 'react';
import { getMyDay, getMyRoster } from '../services/api/schedulesApi';
import type { Schedule, ShiftDefinition } from '../types/models.types';

export interface TodayRoster {
  /** Today's roster row, or null when unscheduled. */
  roster: Schedule | null;
  /** Roster shift definition for today (null when unscheduled / status "off"). */
  rosterShift: ShiftDefinition | null;
  /** Whether the worker is scheduled to a shift today. */
  hasScheduleToday: boolean;
  /**
   * EVERY roster row for today, not just the operative one — a worker can cover
   * several places in one shift (ADR-053). `roster` stays the single row the
   * clock-in screen needs; lists render this.
   */
  allToday: Schedule[];
  loading: boolean;
  /**
   * Re-fetch today's roster. The roster used to be fetched once on mount and
   * never again, so a long-lived Home tab (app left open across a day boundary)
   * showed a stale shift. Screens call this on focus / pull-to-refresh.
   */
  refetch: () => Promise<void>;
}

export function useTodayRoster(): TodayRoster {
  const [roster, setRoster] = useState<Schedule | null>(null);
  const [allToday, setAllToday] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await getMyRoster();
      setRoster(res.data ?? null);
    } catch {
      // Non-blocking — roster info is supplementary; treat as unscheduled.
    } finally {
      setLoading(false);
    }
    // The full day is supplementary: a failure here must not blank the card, so
    // it falls back to the single operative row.
    try {
      const dayRes = await getMyDay();
      setAllToday(dayRes.data ?? []);
    } catch {
      // ignore — falls back to the single operative row
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const rosterShift = roster?.shift_definition ?? null;
  const rows = allToday.length > 0 ? allToday : roster ? [roster] : [];
  return { roster, rosterShift, hasScheduleToday: !!rosterShift, allToday: rows, loading, refetch };
}
