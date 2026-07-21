/**
 * useServerMonitoringSearch — hybrid petugas search for the monitoring map.
 *
 * When online, hits `GET /monitoring/search?q=` (debounced) which is scope-filtered
 * server-side and surfaces off-screen + monitorable-but-unscheduled clock-ins the
 * loaded snapshot omits. When the request fails (offline / server unreachable) it
 * returns `users: null` so the caller falls back to the cached in-store liveUsers,
 * and flags `isOffline` so the UI can show a "cached" badge. Locations/districts
 * stay client-side in `useMonitoringSearch`.
 */

import { useEffect, useRef, useState } from 'react';
import { searchMonitoring } from '../services/api/monitoringApi';
import type { LiveUser } from '../types/models.types';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LEN = 2;

export interface ServerMonitoringSearch {
  /** Server matches when online; `null` when idle/short-query or offline (→ fall back). */
  users: LiveUser[] | null;
  isSearching: boolean;
  /** True when the last server search failed (offline / unreachable). */
  isOffline: boolean;
}

export function useServerMonitoringSearch(query: string): ServerMonitoringSearch {
  const [state, setState] = useState<ServerMonitoringSearch>({
    users: null,
    isSearching: false,
    isOffline: false,
  });
  // Guards against out-of-order responses: only the latest query's result wins.
  const latestQuery = useRef('');

  useEffect(() => {
    const q = query.trim();
    latestQuery.current = q;

    if (q.length < MIN_QUERY_LEN) {
      setState({ users: null, isSearching: false, isOffline: false });
      return;
    }

    setState((prev) => ({ ...prev, isSearching: true }));
    const timer = setTimeout(() => {
      void (async () => {
        const res = await searchMonitoring(q);
        // A newer keystroke superseded this request — drop the stale result.
        if (latestQuery.current !== q) return;
        if (res.error || !res.data) {
          setState({ users: null, isSearching: false, isOffline: true });
          return;
        }
        setState({ users: res.data.users ?? [], isSearching: false, isOffline: false });
      })();
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  return state;
}
