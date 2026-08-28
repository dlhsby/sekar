/**
 * Screen-space decluttering — which markers get a full pin, and which a dot.
 *
 * `salience.ts` says how badly each marker wants to be seen; this says how many
 * can be. The mechanic is the one every dense map uses (Google's own label
 * engine, Mapbox's collision boxes): lay a grid over the screen, and let the
 * highest-scoring candidate in each cell claim it.
 *
 * Why separation rather than a plain "top N by score":
 *  - **Density stays even.** A top-N list happily puts all the slots inside one
 *    troubled rayon and leaves the rest of the city blank. Reserving space
 *    around each winner guarantees spatial spread, which is what makes the map
 *    scannable.
 *  - **It is self-scaling.** How many fit follows screen area, so the same
 *    constants produce sensible density on a laptop and on a wall display, at
 *    every zoom, with no per-zoom table to tune.
 *  - **Zooming reveals continuously.** The box is fixed in PIXELS, so zooming in
 *    shrinks its footprint on the ground and neighbours that crowded each other
 *    separate. Detail arrives smoothly instead of popping at a threshold.
 *
 * Separation is tested against the accepted markers themselves, NOT by bucketing
 * both into a fixed grid. A grid is the cheaper approximation and it visibly
 * fails: two markers 50 px apart that happen to straddle a cell boundary are in
 * different cells, so both were promoted and their labels overlapped anyway
 * ("Taman Kunang2" over "Taman Pandugo"). Cell membership is a proxy for
 * distance; distance is what actually matters, so it is what gets measured. The
 * grid survives as a spatial INDEX over the accepted set — a candidate can only
 * conflict with something in the 3×3 buckets around it, which keeps this O(n)
 * rather than O(n·accepted).
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
 * Minimum separation between two full pins, in screen pixels — **wider than it
 * is tall, on purpose**.
 *
 * A square cell is the wrong collision box for a labelled marker. The pin is
 * ~40 px across; the name printed beside it runs to ~150. With square 88 px
 * cells the pins sat comfortably apart while their LABELS crashed into each
 * other — observed with only 19 markers on screen ("Taman Kartika" over "Taman
 * Kombes"). Sizing the cell to the icon fixes nothing that was broken; sizing
 * it to the label does.
 *
 * The two axes therefore differ because the collision does. Horizontally a
 * marker must reserve room for its name; vertically a label is one line, so the
 * cell only has to clear the pin itself. Making the cell square in either
 * direction is a real loss: 150 square would throw away half the vertical
 * density for nothing, and 96 square is where this started.
 *
 * These are the density dials. Larger breathes, smaller crowds.
 */
export const DEFAULT_CELL_X = 150;
export const DEFAULT_CELL_Y = 96;

/**
 * Separation for the PIN alone, when its name is not printed.
 *
 * Decluttering runs in two passes because the two things collide at different
 * sizes, exactly as Google's own label engine does: many icons, labels on only
 * some of them. Gating a 40 px pin with a 150 px label box threw away the
 * staffing count of everything that lost — 32 of Taman Aktif's 42 lokasi went to
 * dots because their NAMES would have overlapped, which is the wrong thing to
 * pay for a label.
 *
 * A pin is ~40 px across, so 56 leaves it clear of its neighbours without
 * reserving room for text that is not being drawn.
 */
export const PIN_CELL_X = 56;
export const PIN_CELL_Y = 56;

/**
 * Hard ceiling on promoted markers per layer.
 *
 * The grid alone bounds density but not TOTAL: a large window has enough cells
 * to promote hundreds, and each full pin is real DOM. On a laptop viewport the
 * grid yields ~60 cells and binds first, so this is mostly a safety net for a
 * wall display — but it also holds the worst case to something scannable. The
 * tail below it renders as dots, never dropped.
 */
export const DEFAULT_CAP = 45;

export interface DeclutterOptions {
  /** Current map zoom. Cells are pixels, so this is what makes them shrink on the ground. */
  zoom: number;
  cellX?: number;
  cellY?: number;
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
  { zoom, cellX = DEFAULT_CELL_X, cellY = DEFAULT_CELL_Y, cap = DEFAULT_CAP, exempt }: DeclutterOptions
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

  // Spatial index over the ACCEPTED markers, bucketed at exactly the separation
  // box. Anything closer than (cellX, cellY) to a candidate necessarily falls in
  // the 3×3 buckets around it, so this checks a handful of points instead of
  // every winner, and the result is identical to an exhaustive scan.
  const index = new Map<string, { x: number; y: number }[]>();
  let budget = cap;

  for (const c of ranked) {
    if (budget <= 0) break;
    const p = projectToPixel(c.lat, c.lng, zoom);
    const bx = Math.floor(p.x / cellX);
    const by = Math.floor(p.y / cellY);

    let crowded = false;
    for (let dx = -1; dx <= 1 && !crowded; dx++) {
      for (let dy = -1; dy <= 1 && !crowded; dy++) {
        const bucket = index.get(`${bx + dx}:${by + dy}`);
        if (!bucket) continue;
        for (const q of bucket) {
          if (Math.abs(p.x - q.x) < cellX && Math.abs(p.y - q.y) < cellY) {
            crowded = true;
            break;
          }
        }
      }
    }
    if (crowded) continue;

    const key = `${bx}:${by}`;
    const bucket = index.get(key);
    if (bucket) bucket.push(p);
    else index.set(key, [p]);

    promoted.add(c.id);
    budget -= 1;
  }

  return promoted;
}
