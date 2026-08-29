/**
 * Which tiers viewport mode reveals at a given camera height. The mobile twin of
 * web's `lib/monitoring/zoomTiers`, expressed in `latitudeDelta` because that is
 * what `react-native-maps` reports — smaller delta = closer in, so every
 * comparison here is inverted relative to web's zoom levels.
 *
 * A bbox alone does not make the city view lighter: at city height the box IS
 * the city, so "only what is on screen" still meant every kawasan and lokasi at
 * once. The missing half of the mode is **depth** — rayon near the city, kawasan
 * as you close in, lokasi and their people closer still.
 *
 * Thresholds against Surabaya's geography:
 *  - ~0.17° spans the city (the default camera) — rayon only;
 *  - ~0.05° spans roughly one rayon — kawasan become legible;
 *  - ~0.015° spans a neighbourhood — lokasi and workers. This is the same
 *    threshold `UserMarker` already uses to decide a label is readable, so a
 *    pin never appears without a name it can carry.
 *
 * Viewport mode only. Zoom mode draws everything at every height by design.
 */

export interface TierVisibility {
  district: boolean;
  region: boolean;
  location: boolean;
  /** Worker pins and team bubbles — the densest layer, revealed last. */
  workers: boolean;
}

/** Camera span at which each tier appears. Rayon is always on — it is the frame. */
export const TIER_DELTA = {
  region: 0.05,
  location: 0.015,
} as const;

export const ALL_TIERS: TierVisibility = {
  district: true,
  region: true,
  location: true,
  workers: true,
};

/** The tier set for a camera span. Smaller delta = closer in = more tiers. */
export function tiersAtDelta(latitudeDelta: number | undefined): TierVisibility {
  // No camera yet: show the rayon frame only. Guessing "everything" would flash
  // the heavy view for a frame — the thing this mode exists to avoid.
  const d = Number.isFinite(latitudeDelta) ? Math.abs(latitudeDelta as number) : Infinity;
  return {
    district: true,
    region: d <= TIER_DELTA.region,
    location: d <= TIER_DELTA.location,
    workers: d <= TIER_DELTA.location,
  };
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
 * The tier set for a camera span AND a drill scope.
 *
 * Camera span is a proxy for density, and drilling in is where the proxy
 * breaks: a rayon that spans the whole city leaves the camera wide after the
 * fit, so the span gate admitted nothing below rayon and the map showed an
 * empty area behind a "zoom in" hint — with only 42 lokasi to draw.
 *
 * Drilling in IS the request to see what is inside, so it reveals the whole
 * subtree at any span. The gate survives at city scope only, where "every tier"
 * means every lokasi in Surabaya.
 *
 * Density is no longer this function's job either: progressive reveal caps the
 * full pins and draws the remainder as dots, which beats hiding a tier outright.
 */
export function tiersFor({
  latitudeDelta,
  scope,
}: {
  latitudeDelta: number | undefined;
  scope: TierScope | undefined;
}): TierVisibility {
  if (drilledIn(scope)) return ALL_TIERS;
  return tiersAtDelta(latitudeDelta);
}

/**
 * The next tier to appear, for the "zoom in to see more" hint. Null at full
 * depth — which drilling in reaches immediately, so the hint stops promising a
 * tier that is already on screen.
 */
export function nextTierAtDelta(
  latitudeDelta: number | undefined,
  scope?: TierScope,
): 'region' | 'location' | null {
  const t = tiersFor({ latitudeDelta, scope });
  if (!t.region) return 'region';
  if (!t.location) return 'location';
  return null;
}
