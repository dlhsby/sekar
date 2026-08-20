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
export function needsAreaGeometry(zoom: number | undefined): boolean {
  return tiersAtZoom(zoom).region;
}

/** The next tier to appear, for the "zoom in to see more" hint. Null when at full depth. */
export function nextTierAt(zoom: number | undefined): 'region' | 'location' | null {
  const t = tiersAtZoom(zoom);
  if (!t.region) return 'region';
  if (!t.location) return 'location';
  return null;
}
