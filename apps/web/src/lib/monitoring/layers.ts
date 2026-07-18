'use client';

/**
 * Monitoring map layer visibility — which overlays the map draws. Persisted to
 * localStorage so a supervisor's map setup survives reloads (mirrors the mobile
 * `monitoring.layers.v1` key). Consumed by the map (gates rendering) and the
 * Layers control panel (toggles).
 *
 * Two flavours of toggle live here, side by side (mirroring the panel):
 *  - Boundary toggles — draw/hide each geo tier's outline+fill (rayon/kawasan/lokasi).
 *  - Marker toggles — show/hide the worker pins (`petugas`) and the collapsed
 *    team bubbles (`teamBubbles`). The geo NODE markers (count pins) are NOT
 *    gated — they always render, so a supervisor can never hide the map's
 *    primary content.
 */
import { useCallback, useEffect, useState } from 'react';

export interface MonitoringLayers {
  /** Rayon boundary — outline + tinted fill. */
  rayon: boolean;
  /** Kawasan (region) boundary — outline + tinted fill. */
  kawasan: boolean;
  /** Lokasi (area) boundary — outline + tinted fill. */
  lokasi: boolean;
  /** Worker pins / clusters. */
  petugas: boolean;
  /** Collapse each team's members into one team-colored bubble. */
  teamBubbles: boolean;
}

export const DEFAULT_LAYERS: MonitoringLayers = {
  rayon: true,
  kawasan: true,
  lokasi: true,
  petugas: true,
  teamBubbles: true,
};

// v4: split kawasan out of `rayon`, renamed `area`→`lokasi`, dropped `areaPins`
// (node markers are always drawn) and `overdue` (Tanaman Terlambat retired from
// the map); added the `teamBubbles` marker toggle.
const STORAGE_KEY = 'monitoring.layers.v4';

/** Layer toggles rendered by the Layers panel (order matters). */
export const LAYER_TOGGLES: { key: keyof MonitoringLayers; labelKey: string }[] = [
  { key: 'rayon', labelKey: 'monitoring:layers.rayon' },
  { key: 'kawasan', labelKey: 'monitoring:layers.kawasan' },
  { key: 'lokasi', labelKey: 'monitoring:layers.lokasi' },
  { key: 'petugas', labelKey: 'monitoring:layers.petugas' },
  { key: 'teamBubbles', labelKey: 'monitoring:layers.teamBubbles' },
];

function readStored(): MonitoringLayers {
  if (typeof window === 'undefined') return DEFAULT_LAYERS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYERS;
    const parsed = JSON.parse(raw) as Partial<MonitoringLayers>;
    return { ...DEFAULT_LAYERS, ...parsed };
  } catch {
    return DEFAULT_LAYERS;
  }
}

/** Layer state + a toggler, persisted to localStorage. */
export function useMonitoringLayers(): {
  layers: MonitoringLayers;
  toggleLayer: (key: keyof MonitoringLayers) => void;
  setLayer: (key: keyof MonitoringLayers, value: boolean) => void;
} {
  const [layers, setLayers] = useState<MonitoringLayers>(DEFAULT_LAYERS);

  // Hydrate from storage on mount (avoids SSR/client mismatch).
  useEffect(() => {
    setLayers(readStored());
  }, []);

  const persist = useCallback((next: MonitoringLayers) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore write failures (private mode, quota)
    }
    return next;
  }, []);

  const toggleLayer = useCallback(
    (key: keyof MonitoringLayers) =>
      setLayers((prev) => persist({ ...prev, [key]: !prev[key] })),
    [persist]
  );

  const setLayer = useCallback(
    (key: keyof MonitoringLayers, value: boolean) =>
      setLayers((prev) => persist({ ...prev, [key]: value })),
    [persist]
  );

  return { layers, toggleLayer, setLayer };
}
