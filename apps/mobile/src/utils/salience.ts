/**
 * Salience — how much a marker deserves one of the map's limited full-pin slots.
 *
 * The monitoring map carries far more than fits: 8 rayon, 129 kawasan, 953
 * lokasi and every live worker. Drawing all of them produces the wall of
 * identical pins the client sent back, in which the one area with nobody in it
 * looks exactly like the ninety that are fine. Ranking is what makes the map
 * readable, and it is only as good as what it ranks BY.
 *
 * Three additive terms, in descending authority:
 *
 *  1. **Urgency** — the operator's actual question ("where is something wrong?").
 *     Dominant by an order of magnitude, computed from counts the pin already
 *     carries. A calm, fully staffed area scores exactly zero, which is what
 *     makes an empty-looking map a truthful signal rather than a side effect of
 *     the budget.
 *  2. **Affinity** — "the places this supervisor watches" (see `affinity.ts`),
 *     bounded at 3 so it can break a tie between two quiet areas and can never
 *     bury an outage.
 *  3. **Tier** — rayon over kawasan over lokasi, a fraction of a point. Only
 *     orders peers; deliberately far too small to keep a calm rayon ahead of a
 *     lokasi where nobody clocked in.
 *
 * Scoring is pure and data-only: no zoom, no screen position, no map instance.
 * WHERE a marker is competes in `declutter.ts`; this decides only how badly it
 * wants to be seen.
 */

/** Node fields the score reads. A structural subset of `NodeMarker`. */
export interface SalienceNode {
  variant: 'district' | 'location' | 'region' | 'surabaya';
  scheduled: number;
  clocked_in: number;
  belum_hadir: number;
  tidak_hadir: number;
}

/** Worker fields the score reads. A structural subset of `SimpleWorker`. */
export interface SalienceWorker {
  /** `active` = fresh ping · `offline` = stale ping · `absent` = never showed. */
  status: string;
  is_within_area: boolean;
  is_scheduled: boolean;
}

/**
 * Urgency weights. Relative magnitude is the product decision; the absolute
 * scale only matters against {@link TIER_BASE} and the affinity ceiling.
 */
const W = {
  /** Scheduled and did not show. The hardest failure on the roster. */
  tidak_hadir: 3,
  /** Scheduled, shift open, not yet clocked in. Bad, but still recoverable. */
  belum_hadir: 2,
  /**
   * Flat penalty for an area with a roster and NOBODY on it. Without it a
   * one-person site standing empty scores 3 while an eight-person site missing
   * one scores 3 — and total outages at small sites would vanish into dots.
   */
  total_outage: 1.5,
  /** Worker never showed for a scheduled shift. */
  worker_absent: 3,
  /** Worker outside the area they are rostered to. The most actionable signal. */
  worker_outside: 2.5,
  /** Worker's last ping is stale — possibly a dead phone, possibly nothing. */
  worker_stale: 2,
  /** Working off-schedule (ad-hoc). Worth surfacing, not alarming. */
  worker_unscheduled: 1,
} as const;

/**
 * Tier weight. Small on purpose: it breaks ties between equally calm peers and
 * is dwarfed by a single missing worker (3.0). Surabaya sits on top because
 * there is only ever one of it and it is the map's frame.
 */
export const TIER_BASE = {
  surabaya: 1.2,
  district: 0.9,
  region: 0.6,
  location: 0.3,
} as const;

/** Counts come from the API; a NaN must read as "not urgent", never poison the sort. */
const num = (n: number): number => (Number.isFinite(n) ? n : 0);

/** How badly this area wants attention. Zero when nothing is wrong. */
export function nodeUrgency(n: SalienceNode): number {
  const scheduled = num(n.scheduled);
  const clockedIn = num(n.clocked_in);

  // Nothing rostered is not a problem — nobody was meant to be there. It scores
  // zero and is the first thing demoted to a dot.
  if (scheduled <= 0) return 0;

  const shortfall = W.tidak_hadir * num(n.tidak_hadir) + W.belum_hadir * num(n.belum_hadir);
  const deserted = clockedIn <= 0 ? W.total_outage : 0;
  return shortfall + deserted;
}

/** How badly this person wants attention. Zero when they are where they should be. */
export function workerUrgency(w: SalienceWorker): number {
  let score = 0;
  if (w.status === 'absent') score += W.worker_absent;
  else if (w.status === 'offline') score += W.worker_stale;
  if (!w.is_within_area) score += W.worker_outside;
  if (!w.is_scheduled) score += W.worker_unscheduled;
  return score;
}

/**
 * Full salience for an area node.
 *
 * @param affinity from `affinityScore` — bounded at `MAX_AFFINITY` (3), which
 *                 is what guarantees familiarity never outranks an outage.
 */
export function scoreNode(n: SalienceNode, affinity: number): number {
  return nodeUrgency(n) + num(affinity) + (TIER_BASE[n.variant] ?? 0);
}

/**
 * Full salience for a worker.
 *
 * No tier term: workers are decluttered in their own pass (see `declutter.ts`),
 * so they never compete with area pins for a slot and a shared baseline would
 * be arithmetic with no effect.
 */
export function scoreWorker(w: SalienceWorker, affinity: number): number {
  return workerUrgency(w) + num(affinity);
}
