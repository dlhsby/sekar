'use client';

/**
 * Monitoring map layer visibility — which overlays the map draws. Persisted to
 * localStorage so a supervisor's map setup survives reloads (mirrors the mobile
 * `monitoring.layers.v1` key). Consumed by the map (gates rendering) and the
 * Layers control panel (toggles).
 */
import { useCallback, useEffect, useState } from 'react';

export interface MonitoringLayers {
  /** Rayon boundary outline. */
  rayonBorder: boolean;
  /** Rayon fill tinted with its configured color. */
  rayonFill: boolean;
  /** Area boundary outline. */
  areaBorder: boolean;
  /** Area centre pins (drilled/worker view). */
  areaPins: boolean;
  /** Worker pins / clusters ("Semua Petugas" mode). */
  petugas: boolean;
  /** Overdue-plant tint + counts on area pins. */
  overdue: boolean;
}

export const DEFAULT_LAYERS: MonitoringLayers = {
  rayonBorder: true,
  rayonFill: true,
  areaBorder: true,
  areaPins: true,
  petugas: true,
  overdue: false,
};

const STORAGE_KEY = 'monitoring.layers.v2';

/** Layer toggles rendered by the Layers panel (order matters). */
export const LAYER_TOGGLES: { key: keyof MonitoringLayers; labelKey: string }[] = [
  { key: 'rayonBorder', labelKey: 'monitoring:layers.rayonBorder' },
  { key: 'rayonFill', labelKey: 'monitoring:layers.rayonFill' },
  { key: 'areaBorder', labelKey: 'monitoring:layers.areaBorder' },
  { key: 'areaPins', labelKey: 'monitoring:layers.areaPins' },
  { key: 'petugas', labelKey: 'monitoring:layers.petugas' },
  { key: 'overdue', labelKey: 'monitoring:layers.overdue' },
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
