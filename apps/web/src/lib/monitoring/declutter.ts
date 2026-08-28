/**
 * Screen-space decluttering — which markers get a full pin, and which a dot.
 *
 * `salience.ts` says how badly each marker wants to be seen; this says how many
 * can be. The mechanic is the one every dense map uses (Google's own label
 * engine, Mapbox's collision boxes): lay a grid over the screen, and let the
 * highest-scoring candidate in each cell claim it.
 *
 * Why a grid rather than a plain "top N by score":
 *  - **Density stays even.** A top-N list happily puts all sixty slots inside
 *    one troubled rayon and leaves the rest of the city blank. The grid
 *    guarantees spatial spread, which is what makes the map scannable.
 *  - **It is self-scaling.** Cell count follows screen area, so the same
 *    constant produces sensible density on a laptop and on a wall display, at
 *    every zoom, with no per-zoom table to tune.
 *  - **Zooming reveals continuously.** Cells are fixed in PIXELS, so zooming in
 *    shrinks their footprint on the ground and neighbours that shared a cell
 *    separate into their own. Detail arrives smoothly instead of popping at a
 *    threshold.
 *
 * **Nothing is ever dropped.** This returns the promoted set; every other
 * candidate still renders as a small dot at its true position and is still
 * clickable. That is the standing rule on this map — clustering was removed
 * once already for hiding people — and it is why the return type is a set of
 * winners rather than a filtered list.
 *
 * Pure and deterministic: same inputs, same output, so an idle event that does
 * not actually change the view cannot reshuffle the map.
 */
import { projectToPixel } from './mercator';

export interface DeclutterCandidate {
  id: string;
  lat: number;
  lng: number;
  /** From `scoreNode` / `scoreWorker`. Higher wins its cell. */
  score: number;
}

/**
 * Grid cell, in screen pixels.
 *
 * A full pin with its count is roughly 40 px wide and its name label wider
 * still, so 88 leaves a marker's neighbourhood to itself. This is the density
 * dial: smaller shows more and crowds, larger shows fewer and breathes.
 */
export const DEFAULT_CELL_PX = 88;

/**
 * Hard ceiling on promoted markers per layer.
 *
 * The grid alone bounds density but not TOTAL: a large window has enough cells
 * to promote hundreds, and each full pin is real DOM. Sixty is comfortably
 * scannable and comfortably cheap; the tail below it renders as dots.
 */
export const DEFAULT_CAP = 60;

export interface DeclutterOptions {
  /** Current map zoom. Cells are pixels, so this is what makes them shrink on the ground. */
  zoom: number;
  cellPx?: number;
  cap?: number;
  /**
   * Ids that must be drawn in full regardless of score, cell or cap — the
   * selected worker, the node whose detail card is open, an active search hit.
   * If the map stopped drawing what the sidebar is describing, the card would
   * document something invisible.
   *
   * Exempt markers sit OUTSIDE the grid entirely: they neither lose a cell nor
   * claim one, so exempting something never demotes an unrelated marker.
   */
  exempt?: Iterable<string>;
}

const usable = (c: DeclutterCandidate): boolean =>
  Number.isFinite(c.lat) && Number.isFinite(c.lng) && Number.isFinite(c.score);

/**
 * Rank, then fill the grid. Returns the ids to draw as full pins.
 *
 * Ties break on id so the result is stable across renders — without it, two
 * equally calm kawasan in one cell would swap on every idle event and the map
 * would visibly shimmer while the operator sits still.
 */
export function declutter(
  candidates: DeclutterCandidate[],
  { zoom, cellPx = DEFAULT_CELL_PX, cap = DEFAULT_CAP, exempt }: DeclutterOptions
): Set<string> {
  const exemptIds = exempt ? new Set(exempt) : null;
  const promoted = new Set<string>();

  // Copy before sorting: the caller's array is a memoized render input and
  // reordering it in place would be a mutation with no visible cause.
  const ranked = candidates
    .filter((c) => usable(c) && !(exemptIds?.has(c.id) ?? false))
    .slice()
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  // Exemptions first, so a cap of zero still draws the selection.
  if (exemptIds) {
    for (const c of candidates) {
      if (exemptIds.has(c.id) && usable(c)) promoted.add(c.id);
    }
  }

  const taken = new Set<string>();
  let budget = cap;

  for (const c of ranked) {
    if (budget <= 0) break;
    const p = projectToPixel(c.lat, c.lng, zoom);
    const cell = `${Math.floor(p.x / cellPx)}:${Math.floor(p.y / cellPx)}`;
    if (taken.has(cell)) continue;
    taken.add(cell);
    promoted.add(c.id);
    budget -= 1;
  }

  return promoted;
}
