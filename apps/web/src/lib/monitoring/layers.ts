'use client';

/**
 * Monitoring map layer visibility — which overlays the map draws. Persisted to
 * localStorage so a supervisor's map setup survives reloads. Consumed by the map
 * (gates rendering) and the Layers control panel (the selects).
 *
 * Every row is the SAME control: a select, not a switch. Two option sets —
 * one for the geo tiers, one for personnel — because a geo tier can draw a
 * boundary, a marker, both or neither, and personnel can show individuals,
 * teams, both or neither.
 *
 * Why selects replaced toggles (client request, plus a defect they fix):
 *  - Under the old booleans the geo toggle governed the BOUNDARY only; node
 *    markers were always drawn and could not be hidden at all. There was no way
 *    to ask for "markers, no outline".
 *  - `petugas` + `teamBubbles` were independent booleans that could express a
 *    state meaning nothing (Tim on, Petugas off → an empty map), papered over
 *    with a disabled-state hint. One select makes that combination
 *    unrepresentable instead of merely discouraged.
 *
 * There is deliberately NO `city` row. Rayon/kawasan/lokasi each own a
 * `boundary_polygon`; Surabaya is not an entity in the geography model, so a
 * city row would be a control with nothing to draw.
 */
import { useCallback, useEffect, useState } from 'react';

/** What a geo tier draws: its outline, its marker pin, both, or neither. */
export type LayerVisibility = 'all' | 'boundary' | 'marker' | 'none';

/** Which people the map draws. `tim` shows ONLY team members, collapsed. */
export type PersonnelVisibility = 'all' | 'petugas' | 'tim' | 'none';

export interface MonitoringLayers {
  /** Rayon — outline and/or count marker. */
  district: LayerVisibility;
  /** Kawasan (region) — outline and/or count marker. */
  kawasan: LayerVisibility;
  /** Lokasi (area) — outline and/or count marker. */
  lokasi: LayerVisibility;
  /** Worker pins and/or collapsed team bubbles. */
  personnel: PersonnelVisibility;
}

export const DEFAULT_LAYERS: MonitoringLayers = {
  district: 'all',
  kawasan: 'all',
  lokasi: 'all',
  personnel: 'all',
};

const STORAGE_KEY = 'monitoring.layers.v5';
/** Read once to carry a supervisor's existing setup across the v5 rewrite. */
const LEGACY_KEY = 'monitoring.layers.v4';

// ── Predicates. The map asks these rather than comparing strings, so adding an
// option later is one edit here instead of a sweep through the render tree. ────

export const showsBoundary = (v: LayerVisibility): boolean => v === 'all' || v === 'boundary';
export const showsNodeMarker = (v: LayerVisibility): boolean => v === 'all' || v === 'marker';
export const showsWorkerPins = (v: PersonnelVisibility): boolean =>
  v === 'all' || v === 'petugas' || v === 'tim';
export const showsTeamBubbles = (v: PersonnelVisibility): boolean => v === 'all' || v === 'tim';
/** `tim` hides anyone not on a team; the other options show everyone. */
export const teamMembersOnly = (v: PersonnelVisibility): boolean => v === 'tim';

/** One row of the Layers panel. Order matters — it is the render order. */
export interface LayerRow {
  key: keyof MonitoringLayers;
  labelKey: string;
  options: { value: string; labelKey: string }[];
}

const GEO_OPTIONS = [
  { value: 'all', labelKey: 'monitoring:layers.option.all' },
  { value: 'boundary', labelKey: 'monitoring:layers.option.boundary' },
  { value: 'marker', labelKey: 'monitoring:layers.option.marker' },
  { value: 'none', labelKey: 'monitoring:layers.option.none' },
];

export const LAYER_ROWS: LayerRow[] = [
  { key: 'district', labelKey: 'monitoring:layers.district', options: GEO_OPTIONS },
  { key: 'kawasan', labelKey: 'monitoring:layers.kawasan', options: GEO_OPTIONS },
  { key: 'lokasi', labelKey: 'monitoring:layers.lokasi', options: GEO_OPTIONS },
  {
    key: 'personnel',
    labelKey: 'monitoring:layers.personnel',
    options: [
      { value: 'all', labelKey: 'monitoring:layers.option.all' },
      { value: 'petugas', labelKey: 'monitoring:layers.option.petugasOnly' },
      { value: 'tim', labelKey: 'monitoring:layers.option.timOnly' },
      { value: 'none', labelKey: 'monitoring:layers.option.none' },
    ],
  },
];

interface LegacyLayers {
  district?: boolean;
  kawasan?: boolean;
  lokasi?: boolean;
  petugas?: boolean;
  teamBubbles?: boolean;
}

/**
 * Carry a v4 setup forward without changing what the supervisor currently sees.
 *
 * The subtle half is `false`. A v4 geo toggle governed the BOUNDARY only — the
 * node marker was drawn regardless — so "off" migrates to `'marker'`, not
 * `'none'`. Mapping it to `'none'` would silently remove pins that were on
 * screen before the upgrade.
 */
export function migrateLegacy(legacy: LegacyLayers): MonitoringLayers {
  const geo = (on: boolean | undefined): LayerVisibility =>
    on === false ? 'marker' : 'all';
  const personnel: PersonnelVisibility =
    legacy.petugas === false ? 'none' : legacy.teamBubbles === false ? 'petugas' : 'all';
  return {
    district: geo(legacy.district),
    kawasan: geo(legacy.kawasan),
    lokasi: geo(legacy.lokasi),
    personnel,
  };
}

function readStored(): MonitoringLayers {
  if (typeof window === 'undefined') return DEFAULT_LAYERS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MonitoringLayers>;
      return { ...DEFAULT_LAYERS, ...parsed };
    }
    const legacyRaw = window.localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) return migrateLegacy(JSON.parse(legacyRaw) as LegacyLayers);
    return DEFAULT_LAYERS;
  } catch {
    return DEFAULT_LAYERS;
  }
}

/** Layer state + a setter, persisted to localStorage. */
export function useMonitoringLayers(): {
  layers: MonitoringLayers;
  setLayer: (key: keyof MonitoringLayers, value: string) => void;
} {
  const [layers, setLayers] = useState<MonitoringLayers>(DEFAULT_LAYERS);

  // Hydrate from storage on mount (avoids SSR/client mismatch).
  useEffect(() => {
    setLayers(readStored());
  }, []);

  const setLayer = useCallback((key: keyof MonitoringLayers, value: string) => {
    setLayers((prev) => {
      const next = { ...prev, [key]: value } as MonitoringLayers;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore write failures (private mode, quota)
      }
      return next;
    });
  }, []);

  return { layers, setLayer };
}
