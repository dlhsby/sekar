/**
 * useTodayRoster Hook
 *
 * Fetches the authenticated worker's roster row for today (WIB) — the single
 * schedule concept (ADR-013). This is the authoritative "am I scheduled today?"
 * signal shared by the clock-in screen and the home "Kehadiran saya" hero, so
 * both agree on lateness / area semantics. An unscheduled worker (patrol /
 * ad-hoc) resolves to `hasScheduleToday === false` with a null roster shift.
 */

import { useState, useEffect } from 'react';
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
}

export function useTodayRoster(): TodayRoster {
  const [roster, setRoster] = useState<Schedule | null>(null);
  const [allToday, setAllToday] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getMyRoster()
      .then((res) => {
        if (!active) return;
        setRoster(res.data ?? null);
        setLoading(false);
      })
      .catch(() => {
        // Non-blocking — roster info is supplementary; treat as unscheduled.
        if (active) {
          setLoading(false);
        }
      });
    // The full day is supplementary: a failure here must not blank the card, so
    // it falls back to the single operative row.
    getMyDay()
      .then((res) => {
        if (active) setAllToday(res.data ?? []);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const rosterShift = roster?.shift_definition ?? null;
  const rows = allToday.length > 0 ? allToday : roster ? [roster] : [];
  return { roster, rosterShift, hasScheduleToday: !!rosterShift, allToday: rows, loading };
}
