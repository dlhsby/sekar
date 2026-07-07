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
import { getMyRoster } from '../services/api/schedulesApi';
import type { Schedule, ShiftDefinition } from '../types/models.types';

export interface TodayRoster {
  /** Today's roster row, or null when unscheduled. */
  roster: Schedule | null;
  /** Roster shift definition for today (null when unscheduled / status "off"). */
  rosterShift: ShiftDefinition | null;
  /** Whether the worker is scheduled to a shift today. */
  hasScheduleToday: boolean;
  loading: boolean;
}

export function useTodayRoster(): TodayRoster {
  const [roster, setRoster] = useState<Schedule | null>(null);
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
    return () => {
      active = false;
    };
  }, []);

  const rosterShift = roster?.shift_definition ?? null;
  return { roster, rosterShift, hasScheduleToday: !!rosterShift, loading };
}
