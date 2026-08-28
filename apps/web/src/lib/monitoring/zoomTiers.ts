'use client';

/**
 * Which tiers viewport mode reveals at a given map zoom.
 *
 * A bbox alone does not make the city view lighter: at city zoom the box IS the
 * city, so "only what is on screen" still meant every kawasan and every lokasi
 * at once — hundreds of pins stacked into an unreadable field. The missing half
 * of the mode is **depth**: near the city you see rayon, zooming in reveals
 * kawasan, zooming further reveals lokasi and the people in them.
 *
 * This is the standard behaviour of any map that carries more detail than fits:
 * detail arrives as there is room for it, and panning at that zoom brings the
 * neighbouring detail with it.
 *
 * Thresholds are Google Maps zoom levels, chosen against Surabaya's geography:
 *  - ~11 fits the whole city (the default view) — rayon only;
 *  - ~13 fits roughly one rayon — kawasan become legible;
 *  - ~14.5 fits a neighbourhood — lokasi pins and the workers standing in them.
 *
 * Applies to **viewport mode only**. Zoom mode deliberately draws everything at
 * every zoom: that is the trade the client chose there, and quietly hiding tiers
 * in it would answer a question she did not ask.
 *
 * **The gate applies at city scope only** — see {@link tiersFor}. Zoom is a
 * proxy for density, and a poor one once you have drilled in: "Rayon Taman
 * Aktif" spans the whole city, so drilling into it leaves the camera at city
 * zoom and this rule hid all 42 of its lokasi behind a "zoom in" hint, on a map
 * with room to spare. Density is also no longer this function's problem —
 * progressive reveal caps the full pins and draws the remainder as dots, which
 * beats hiding a tier outright.
 */

export interface TierVisibility {
  district: boolean;
  region: boolean;
  location: boolean;
  /** Worker pins and team bubbles — the densest layer, revealed last. */
  workers: boolean;
}

/** Zoom at which each tier appears. Rayon is always on — it is the map's frame. */
export const TIER_ZOOM = {
  region: 13,
  location: 14.5,
  workers: 14.5,
} as const;

/** The tier set for a zoom level. Higher zoom = closer in = more tiers. */
export function tiersAtZoom(zoom: number | undefined): TierVisibility {
  // No zoom yet (first render, before the map reports one): show the rayon frame
  // only. Guessing "everything" would flash the heavy view for one frame — the
  // exact thing this mode exists to avoid.
  const z = Number.isFinite(zoom) ? (zoom as number) : 0;
  return {
    district: true,
    region: z >= TIER_ZOOM.region,
    location: z >= TIER_ZOOM.location,
    workers: z >= TIER_ZOOM.workers,
  };
}

/**
 * Does the current zoom warrant the heavy `level='area'` boundary payload?
 *
 * Below the kawasan threshold the map draws rayon outlines only, so asking for
 * full geometry would download shapes nothing renders.
 */
export function needsAreaGeometry(zoom: number | undefined, scope?: TierScope): boolean {
  return tiersFor({ zoom, scope }).region;
}

/**
 * Drill scope, as far as tier admission is concerned. Only the distinction
 * between "looking at the whole city" and "looking inside something" matters.
 */
export type TierScope = 'surabaya' | 'city' | 'district' | 'region' | 'location';

/** Has the operator asked to look inside a particular place? */
const drilledIn = (scope: TierScope | undefined): boolean =>
  scope === 'district' || scope === 'region' || scope === 'location';

/**
 * The tier set for a zoom AND a drill scope.
 *
 * Drilling in IS the request to see what is inside, so it reveals the whole
 * subtree at any zoom. The zoom gate survives only at city scope, where "every
 * tier at once" means all 1089 nodes in Surabaya — real DOM even as dots, and
 * the one place the gate still earns its keep.
 */
export function tiersFor({
  zoom,
  scope,
}: {
  zoom: number | undefined;
  scope: TierScope | undefined;
}): TierVisibility {
  if (drilledIn(scope)) {
    return { district: true, region: true, location: true, workers: true };
  }
  return tiersAtZoom(zoom);
}

/**
 * The next tier to appear, for the "zoom in to see more" hint. Null when at full
 * depth — which drilling in reaches immediately, so the hint stops promising a
 * tier that is already on screen.
 */
export function nextTierAt(
  zoom: number | undefined,
  scope?: TierScope
): 'region' | 'location' | null {
  const t = tiersFor({ zoom, scope });
  if (!t.region) return 'region';
  if (!t.location) return 'location';
  return null;
}
