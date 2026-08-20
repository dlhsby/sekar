'use client';

/**
 * Monitoring map mode — how much of the hierarchy the map shows at once.
 *
 * Three modes, chosen by the supervisor and persisted per browser (same
 * mechanism as the layer facets, so both survive a reload together):
 *
 *  - **drill** (default) — a worker renders at THEIR OWN schedule tier and only
 *    there (ADR-046 `display_scope`), and the map draws one level of children at
 *    a time. This is the delivered model and stays the default so nobody's map
 *    gets heavier without asking.
 *
 *  - **zoom** — every tier inside the current subtree is drawn at once: all
 *    rayon, kawasan and lokasi, plus every worker standing in them regardless of
 *    which tier their schedule is scoped to. Tapping a rayon still narrows, but
 *    it narrows to *that rayon's whole subtree* rather than to its immediate
 *    children. Nothing is bounded, which is the client's explicit trade.
 *
 *  - **viewport** — zoom mode, restricted to what the camera can see. The bounds
 *    go to the SERVER (`?bbox=`), so the ~1.5 MB of city-wide geometry and the
 *    per-district builder passes behind it are never produced for regions
 *    off-screen. Panning or zooming out fetches more. Same drawing rules as
 *    zoom; only the extent differs.
 *
 * The modes differ ONLY in what is drawn or fetched. No count is re-derived: the
 * same aggregate nodes, with the same numbers, back all three — `scope=all` is
 * composed server-side from the very builders the drill scopes use, and a bbox
 * narrows which NODES are built while `totals` stay scope-wide (a header that
 * moved as you panned would be reporting the camera, not the city). If a number
 * ever differs between modes, that is a bug, not a mode.
 */
import { useCallback, useEffect, useState } from 'react';

export type MonitoringMode = 'drill' | 'zoom' | 'viewport';

/** Zoom and viewport draw the same thing; they differ in how much they ask for. */
export const isZoomLike = (m: MonitoringMode): boolean => m === 'zoom' || m === 'viewport';

export const DEFAULT_MODE: MonitoringMode = 'drill';

const STORAGE_KEY = 'monitoring.mode.v1';

/** Mode options rendered by the settings panel (order matters). */
export const MODE_OPTIONS: { value: MonitoringMode; labelKey: string }[] = [
  { value: 'drill', labelKey: 'monitoring:mode.drill' },
  { value: 'zoom', labelKey: 'monitoring:mode.zoom' },
  { value: 'viewport', labelKey: 'monitoring:mode.viewport' },
];

const MODES: MonitoringMode[] = ['drill', 'zoom', 'viewport'];

function readStored(): MonitoringMode {
  if (typeof window === 'undefined') return DEFAULT_MODE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) as MonitoringMode | null;
    return raw && MODES.includes(raw) ? raw : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

/** Mode state + a setter, persisted to localStorage. */
export function useMonitoringMode(): {
  mode: MonitoringMode;
  setMode: (mode: MonitoringMode) => void;
} {
  const [mode, setModeState] = useState<MonitoringMode>(DEFAULT_MODE);

  // Hydrate after mount so SSR and the first client render agree.
  useEffect(() => {
    setModeState(readStored());
  }, []);

  const setMode = useCallback((next: MonitoringMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore write failures (private mode, quota)
    }
  }, []);

  return { mode, setMode };
}
