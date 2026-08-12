'use client';

/**
 * Monitoring map mode — how much of the hierarchy the map shows at once.
 *
 * Two modes, chosen by the supervisor and persisted per browser (same mechanism
 * as the layer selects, so both survive a reload together):
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
 *    children.
 *
 * The modes differ ONLY in what is drawn. No count is re-derived: the same
 * aggregate nodes, with the same numbers, back both — `scope=all` is composed
 * server-side from the very builders the drill scopes use. If a number ever
 * differs between modes, that is a bug, not a mode.
 */
import { useCallback, useEffect, useState } from 'react';

export type MonitoringMode = 'drill' | 'zoom';

export const DEFAULT_MODE: MonitoringMode = 'drill';

const STORAGE_KEY = 'monitoring.mode.v1';

/** Mode options rendered by the settings panel (order matters). */
export const MODE_OPTIONS: { value: MonitoringMode; labelKey: string }[] = [
  { value: 'drill', labelKey: 'monitoring:mode.drill' },
  { value: 'zoom', labelKey: 'monitoring:mode.zoom' },
];

function readStored(): MonitoringMode {
  if (typeof window === 'undefined') return DEFAULT_MODE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'zoom' || raw === 'drill' ? raw : DEFAULT_MODE;
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
