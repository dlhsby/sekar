'use client';

/**
 * Monitoring map layer visibility — which overlays the map draws. Persisted to
 * localStorage so a supervisor's map setup survives reloads. Consumed by the map
 * (gates rendering) and the Layers control panel (the checkbox chips).
 *
 * Every row is a SET of independent facets, not one of N mutually exclusive
 * options. A geo tier can draw its outline, its fill, its marker pin and its
 * name label — in any combination. Personnel can draw individual pins, collapsed
 * team bubbles, or both.
 *
 * Why a set replaced the four-way select (client request, plus a defect it fixes):
 *  - The select forced the operator to translate what they wanted ("outline and
 *    marker, no fill") into one of four named states, and "Batas saja" silently
 *    meant *outline **and** fill* — the fill was never separately expressible
 *    even though it is the heaviest thing the map paints.
 *  - Reading a select is a lookup ("which of these four is the one I want?");
 *    reading three checkboxes is direct. The client's words: "it's confusing to
 *    select which one".
 *  - `Semua` / `Sembunyikan` survive as SHORTCUTS (select-all / clear), not as
 *    values — so they can never disagree with the checkboxes below them.
 *
 * Prior generations, all still migrated on read:
 *  - v4 booleans, one per tier, governing the boundary only.
 *  - v5 four-way enum (`all | boundary | marker | none`).
 *
 * There is deliberately NO `city` row. Rayon/kawasan/lokasi each own a
 * `boundary_polygon`; Surabaya is not an entity in the geography model, so a
 * city row would be a control with nothing to draw.
 */
import { useCallback, useEffect, useState } from 'react';

/**
 * What a geo tier can draw. Independent — any subset is valid, including none.
 *
 * `marker` is the pin; `label` is the name beside it. They are separate because
 * a dense tier is often wanted as pins ALONE — at city zoom every lokasi name
 * printing at once is unreadable, while the pins themselves still carry the
 * counts.
 */
export type GeoFacet = 'boundary' | 'fill' | 'marker' | 'label';

/** Which people the map draws. `tim` alone hides anyone not on a team. */
export type PersonnelFacet = 'petugas' | 'tim';

export type GeoLayer = GeoFacet[];
export type PersonnelLayer = PersonnelFacet[];

export const GEO_FACETS: GeoFacet[] = ['boundary', 'fill', 'marker', 'label'];
export const PERSONNEL_FACETS: PersonnelFacet[] = ['petugas', 'tim'];

export interface MonitoringLayers {
  /** Rayon — outline / fill / count marker / name label. */
  district: GeoLayer;
  /** Kawasan (region) — outline / fill / count marker / name label. */
  kawasan: GeoLayer;
  /** Lokasi (area) — outline / fill / count marker / name label. */
  lokasi: GeoLayer;
  /** Worker pins and/or collapsed team bubbles. */
  personnel: PersonnelLayer;
}

export const DEFAULT_LAYERS: MonitoringLayers = {
  district: ['boundary', 'fill', 'marker', 'label'],
  kawasan: ['boundary', 'fill', 'marker', 'label'],
  lokasi: ['boundary', 'fill', 'marker', 'label'],
  personnel: ['petugas', 'tim'],
};

const STORAGE_KEY = 'monitoring.layers.v6';
/** Read once each to carry an existing setup across the two rewrites. */
const LEGACY_V5_KEY = 'monitoring.layers.v5';
const LEGACY_V4_KEY = 'monitoring.layers.v4';

// ── Predicates. The map asks these rather than inspecting arrays, so adding a
// facet later is one edit here instead of a sweep through the render tree. ─────

export const showsBoundary = (v: GeoLayer): boolean => v.includes('boundary');
export const showsFill = (v: GeoLayer): boolean => v.includes('fill');
export const showsNodeMarker = (v: GeoLayer): boolean => v.includes('marker');
/** The name beside the pin. Independent of the pin itself. */
export const showsNodeLabel = (v: GeoLayer): boolean => v.includes('label');
/**
 * Whether the polygon element is worth mounting at all. Fill without an outline
 * is a legitimate ask (a soft wash under the pins), so this is an OR, not
 * `showsBoundary` — the two facets then set `strokeOpacity` / `fillOpacity`.
 */
export const showsPolygon = (v: GeoLayer): boolean => showsBoundary(v) || showsFill(v);

/** Team bubbles are built FROM the worker set, so any personnel facet needs it. */
export const showsWorkerPins = (v: PersonnelLayer): boolean => v.length > 0;
export const showsTeamBubbles = (v: PersonnelLayer): boolean => v.includes('tim');
/** Tim alone hides anyone not on a team; ticking Petugas brings them back. */
export const teamMembersOnly = (v: PersonnelLayer): boolean =>
  v.includes('tim') && !v.includes('petugas');

/** One row of the Layers panel. Order matters — it is the render order. */
export interface LayerRow {
  key: keyof MonitoringLayers;
  labelKey: string;
  facets: { value: string; labelKey: string }[];
}

const GEO_FACET_ROWS = [
  { value: 'boundary', labelKey: 'monitoring:layers.facet.boundary' },
  { value: 'fill', labelKey: 'monitoring:layers.facet.fill' },
  { value: 'marker', labelKey: 'monitoring:layers.facet.marker' },
  { value: 'label', labelKey: 'monitoring:layers.facet.label' },
];

export const LAYER_ROWS: LayerRow[] = [
  { key: 'district', labelKey: 'monitoring:layers.district', facets: GEO_FACET_ROWS },
  { key: 'kawasan', labelKey: 'monitoring:layers.kawasan', facets: GEO_FACET_ROWS },
  { key: 'lokasi', labelKey: 'monitoring:layers.lokasi', facets: GEO_FACET_ROWS },
  {
    key: 'personnel',
    labelKey: 'monitoring:layers.personnel',
    facets: [
      { value: 'petugas', labelKey: 'monitoring:layers.facet.petugas' },
      { value: 'tim', labelKey: 'monitoring:layers.facet.tim' },
    ],
  },
];

/** Every facet a row can hold — the target of the "Semua" shortcut. */
export function allFacets(key: keyof MonitoringLayers): string[] {
  return key === 'personnel' ? [...PERSONNEL_FACETS] : [...GEO_FACETS];
}

/** Add or remove one facet, preserving the canonical order. */
export function toggleFacet(
  key: keyof MonitoringLayers,
  current: readonly string[],
  facet: string
): string[] {
  const next = current.includes(facet)
    ? current.filter((f) => f !== facet)
    : [...current, facet];
  const order = allFacets(key);
  return order.filter((f) => next.includes(f));
}

// ── Migration ────────────────────────────────────────────────────────────────

type LegacyV5Visibility = 'all' | 'boundary' | 'marker' | 'none';

interface LegacyV5Layers {
  district?: LegacyV5Visibility;
  kawasan?: LegacyV5Visibility;
  lokasi?: LegacyV5Visibility;
  personnel?: 'all' | 'petugas' | 'tim' | 'none';
}

interface LegacyV4Layers {
  district?: boolean;
  kawasan?: boolean;
  lokasi?: boolean;
  petugas?: boolean;
  teamBubbles?: boolean;
}

/**
 * v5 → v6. The subtle half is `'boundary'`: under v5 it drew the outline AND the
 * fill (the two were one thing), so it migrates to both facets. Mapping it to
 * `['boundary']` alone would quietly strip the fill off a map that had it.
 */
export function migrateV5(legacy: LegacyV5Layers): MonitoringLayers {
  const geo = (v: LegacyV5Visibility | undefined): GeoLayer => {
    switch (v) {
      case 'boundary':
        return ['boundary', 'fill'];
      case 'marker':
        // v5's marker drew its name too — the two were one thing.
        return ['marker', 'label'];
      case 'none':
        return [];
      default:
        return ['boundary', 'fill', 'marker', 'label'];
    }
  };
  const personnel: PersonnelLayer =
    legacy.personnel === 'none'
      ? []
      : legacy.personnel === 'petugas'
        ? ['petugas']
        : legacy.personnel === 'tim'
          ? ['tim']
          : ['petugas', 'tim'];
  return {
    district: geo(legacy.district),
    kawasan: geo(legacy.kawasan),
    lokasi: geo(legacy.lokasi),
    personnel,
  };
}

/**
 * v4 → v6, via the same reasoning the v5 migration used: a v4 geo toggle
 * governed the BOUNDARY only — the node marker was drawn regardless — so "off"
 * keeps the marker rather than blanking the tier.
 */
export function migrateV4(legacy: LegacyV4Layers): MonitoringLayers {
  const geo = (on: boolean | undefined): GeoLayer =>
    on === false ? ['marker', 'label'] : ['boundary', 'fill', 'marker', 'label'];
  const personnel: PersonnelLayer =
    legacy.petugas === false ? [] : legacy.teamBubbles === false ? ['petugas'] : ['petugas', 'tim'];
  return {
    district: geo(legacy.district),
    kawasan: geo(legacy.kawasan),
    lokasi: geo(legacy.lokasi),
    personnel,
  };
}

/**
 * Keep only facets this version knows, in canonical order.
 *
 * Stored JSON is user-writable and survives downgrades, so a row could arrive as
 * a string (v5), as `null`, or carrying a facet a future version added. Anything
 * unrecognisable falls back to the default for that row rather than rendering a
 * row whose checkboxes match nothing.
 */
function sanitize(parsed: Partial<Record<keyof MonitoringLayers, unknown>>): MonitoringLayers {
  const clean = (key: keyof MonitoringLayers): string[] => {
    const raw = parsed[key];
    if (!Array.isArray(raw)) return [...DEFAULT_LAYERS[key]];
    const known = allFacets(key);
    return known.filter((f) => raw.includes(f));
  };
  return {
    district: clean('district') as GeoLayer,
    kawasan: clean('kawasan') as GeoLayer,
    lokasi: clean('lokasi') as GeoLayer,
    personnel: clean('personnel') as PersonnelLayer,
  };
}

function readStored(): MonitoringLayers {
  if (typeof window === 'undefined') return DEFAULT_LAYERS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return sanitize(JSON.parse(raw) as Record<string, unknown>);
    const v5 = window.localStorage.getItem(LEGACY_V5_KEY);
    if (v5) return migrateV5(JSON.parse(v5) as LegacyV5Layers);
    const v4 = window.localStorage.getItem(LEGACY_V4_KEY);
    if (v4) return migrateV4(JSON.parse(v4) as LegacyV4Layers);
    return DEFAULT_LAYERS;
  } catch {
    return DEFAULT_LAYERS;
  }
}

/** Layer state + a setter, persisted to localStorage. */
export function useMonitoringLayers(): {
  layers: MonitoringLayers;
  setLayer: (key: keyof MonitoringLayers, facets: string[]) => void;
} {
  const [layers, setLayers] = useState<MonitoringLayers>(DEFAULT_LAYERS);

  // Hydrate from storage on mount (avoids SSR/client mismatch).
  useEffect(() => {
    setLayers(readStored());
  }, []);

  const setLayer = useCallback((key: keyof MonitoringLayers, facets: string[]) => {
    setLayers((prev) => {
      const next = { ...prev, [key]: facets } as MonitoringLayers;
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
