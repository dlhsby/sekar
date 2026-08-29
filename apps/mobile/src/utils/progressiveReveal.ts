/**
 * Progressive reveal — the one place salience, affinity and decluttering meet.
 *
 * Mirrors web's `lib/monitoring/useProgressiveReveal.ts` exactly. The module is
 * free of DOM and browser APIs, so it ports unchanged; the platform difference
 * lives one level down, in how `zoom` is obtained (see `mercator.deltaToZoom`).
 *
 * Viewport mode's original rule was a zoom threshold per tier: past zoom 13
 * every kawasan in the box renders. On the real dataset that is 129 identical
 * pins at once, and the one kawasan with nobody clocked in looks exactly like
 * the ninety that are fine. Threshold answers "does this TIER fit?"; the
 * operator's question is "which of these matter?".
 *
 * So the tiers stay exactly as they were — they still gate which tiers are
 * eligible at all (`zoomTiers.ts`) — and this ranks WITHIN them:
 *
 *   candidates → score (urgency + affinity + tier) → grid declutter → promoted
 *
 * Everything not promoted still draws, as a dot. Nothing is hidden.
 *
 * **Pins are presence; labels are detail.** That distinction decides which
 * modes get which pass:
 *
 *  - The **pin** pass runs in viewport mode only. Drill mode is unchanged by
 *    definition, and zoom mode deliberately draws everything at every zoom —
 *    that is the trade the client chose there. `promoted*` is `null` in both,
 *    which callers read as "draw every marker in full".
 *  - The **label** pass runs in EVERY mode. Two names cannot occupy the same
 *    pixels in any mode, and printing them anyway does not add information, it
 *    destroys it: measured in drill mode at kawasan depth, 40 labels produced 22
 *    overlapping pairs and neither name in a pair could be read. Withholding a
 *    name costs nothing that was legible in the first place, and — unlike the
 *    pin pass — it never removes a marker, a count or a gesture.
 */
import { useMemo } from 'react';
import {
  declutter,
  DEFAULT_CAP,
  DEFAULT_CELL_X,
  DEFAULT_CELL_Y,
  PIN_CELL_X,
  PIN_CELL_Y,
  type DeclutterCandidate,
} from './declutter';
import { scoreNode, scoreWorker, type SalienceNode, type SalienceWorker } from './salience';

export interface RevealNode extends SalienceNode {
  id: string;
  lat: number;
  lng: number;
}

export interface RevealWorker extends SalienceWorker {
  user_id: string;
  lat: number;
  lng: number;
}

export interface ProgressiveRevealInput {
  /**
   * Gates the PIN pass only (viewport mode). False in drill and zoom mode, where
   * every marker is still drawn in full — but their LABELS are decluttered in
   * every mode. See {@link computeReveal}.
   */
  enabled: boolean;
  zoom: number | undefined;
  nodes: RevealNode[];
  workers: RevealWorker[];
  /** From `useAffinity`. Bounded, so it can only ever break ties. */
  affinityOf: (id: string) => number;
  /** Selected / open / searched ids, which are always drawn in full. Nullable for caller convenience. */
  exemptNodeIds?: ReadonlyArray<string | null | undefined>;
  exemptWorkerIds?: ReadonlyArray<string | null | undefined>;
  cellX?: number;
  cellY?: number;
  cap?: number;
}

export interface ProgressiveReveal {
  /** Ids to draw as full pins. `null` means reveal is off — draw everything in full. */
  promotedNodes: Set<string> | null;
  promotedWorkers: Set<string> | null;
  /**
   * Ids that additionally get their NAME printed — always a subset of the
   * promoted set. Labels are decluttered separately because they collide at a
   * different size: a pin is ~40 px, its name ~150. One box for both meant a
   * marker lost its staffing count merely because its name would not have fit.
   */
  labelledNodes: Set<string> | null;
  labelledWorkers: Set<string> | null;
}

/**
 * Zoom is quantised before it reaches the grid.
 *
 * Google reports fractional zoom continuously during a pinch or a smooth
 * scroll. Feeding that straight in would re-rank on every animation frame and
 * pins would flicker between dot and full form mid-gesture. Half a level is
 * finer than any promotion the operator can perceive and coarse enough to hold
 * the layout still while the gesture runs.
 */
export const ZOOM_QUANTUM = 0.5;

export const quantiseZoom = (zoom: number | undefined): number =>
  Number.isFinite(zoom) ? Math.round((zoom as number) / ZOOM_QUANTUM) * ZOOM_QUANTUM : 0;

const defined = (ids: ReadonlyArray<string | null | undefined> | undefined): string[] =>
  (ids ?? []).filter((id): id is string => typeof id === 'string' && id.length > 0);

/**
 * Pure core. Nodes and workers are decluttered in SEPARATE passes, each with its
 * own grid and its own budget — so turning the Petugas layer off can never
 * reshuffle which kawasan are drawn, and a crowd of workers cannot push the area
 * pins off the map. They are independent layers to the operator; they behave as
 * independent layers here.
 */
export function computeReveal({
  enabled,
  zoom,
  nodes,
  workers,
  affinityOf,
  exemptNodeIds,
  exemptWorkerIds,
  cellX = DEFAULT_CELL_X,
  cellY = DEFAULT_CELL_Y,
  cap = DEFAULT_CAP,
}: ProgressiveRevealInput): ProgressiveReveal {
  const z = quantiseZoom(zoom);

  const nodeCandidates: DeclutterCandidate[] = nodes.map((n) => ({
    id: n.id,
    lat: n.lat,
    lng: n.lng,
    score: scoreNode(n, affinityOf(n.id)),
  }));

  // The rayon tier is never demoted.
  //
  // `zoomTiers` already holds rayon on at every zoom because they are the map's
  // frame — the thing that tells you WHERE you are before it tells you what is
  // there. Demotion has to follow the same rule or the frame develops holes: at
  // city zoom the eight rayon spread over ~700 px, so a label-width grid put
  // three of them in shared cells and drew them as dots. There are only ever
  // eight, and once you have drilled in only one is on screen, so exempting
  // them costs nothing and guarantees the frame is whole.
  const frameIds = nodes
    .filter((n) => n.variant === 'district' || n.variant === 'surabaya')
    .map((n) => n.id);

  const workerCandidates: DeclutterCandidate[] = workers.map((w) => ({
    id: w.user_id,
    lat: w.lat,
    lng: w.lng,
    score: scoreWorker(w, affinityOf(w.user_id)),
  }));

  // Pass 1 — which markers are drawn at all, at pin separation. Viewport only.
  const promotedNodes = enabled
    ? declutter(nodeCandidates, {
        zoom: z,
        cellX: PIN_CELL_X,
        cellY: PIN_CELL_Y,
        cap,
        exempt: [...frameIds, ...defined(exemptNodeIds)],
      })
    : null;
  const promotedWorkers = enabled
    ? declutter(workerCandidates, {
        zoom: z,
        cellX: PIN_CELL_X,
        cellY: PIN_CELL_Y,
        cap,
        exempt: defined(exemptWorkerIds),
      })
    : null;

  // Pass 2 — which of those also get their name, at label separation. Every
  // mode: see the module docblock. Run over the drawn markers only (all of them
  // when the pin pass is off), so a label can never appear on a dot. No cap —
  // the wider box is its own limit.
  //
  // The frame exemption deliberately does NOT carry over here. A rayon must
  // always be DRAWN, because the frame is how you know where you are; its name
  // is detail, and detail may yield to a neighbour that needs the space more.
  const labelPass = (
    candidates: DeclutterCandidate[],
    promoted: Set<string> | null,
    exempt: string[]
  ) =>
    declutter(promoted ? candidates.filter((c) => promoted.has(c.id)) : candidates, {
      zoom: z,
      cellX,
      cellY,
      cap: Number.POSITIVE_INFINITY,
      exempt,
    });

  return {
    promotedNodes,
    promotedWorkers,
    labelledNodes: labelPass(nodeCandidates, promotedNodes, defined(exemptNodeIds)),
    labelledWorkers: labelPass(workerCandidates, promotedWorkers, defined(exemptWorkerIds)),
  };
}

/**
 * Memoized wrapper. Re-ranks only when the quantised zoom, the candidate set or
 * the exemptions actually change — a pan that moves the camera without changing
 * any of those costs nothing.
 */
export function useProgressiveReveal(input: ProgressiveRevealInput): ProgressiveReveal {
  const { enabled, zoom, nodes, workers, affinityOf, exemptNodeIds, exemptWorkerIds } = input;
  const z = quantiseZoom(zoom);
  const nodeKey = exemptNodeIds?.join(',') ?? '';
  const workerKey = exemptWorkerIds?.join(',') ?? '';

  return useMemo(
    () =>
      computeReveal({
        enabled,
        zoom: z,
        nodes,
        workers,
        affinityOf,
        exemptNodeIds,
        exemptWorkerIds,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- exemption arrays are compared by their joined keys
    [enabled, z, nodes, workers, affinityOf, nodeKey, workerKey]
  );
}
