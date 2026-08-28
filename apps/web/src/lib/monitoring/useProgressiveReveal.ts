'use client';

/**
 * Progressive reveal — the one place salience, affinity and decluttering meet.
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
 * **Viewport mode only.** Drill mode is unchanged by definition, and zoom mode
 * deliberately draws everything at every zoom — that is the trade the client
 * chose there, and quietly ranking it would answer a question she did not ask.
 * When `enabled` is false both sets are `null`, which callers read as "draw
 * every marker in full", so those two modes stay byte-for-byte as they were.
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
  /** False in drill/zoom mode — both sets come back null and nothing changes. */
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

export const REVEAL_OFF: ProgressiveReveal = {
  promotedNodes: null,
  promotedWorkers: null,
  labelledNodes: null,
  labelledWorkers: null,
};

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
  if (!enabled) return REVEAL_OFF;

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

  // Pass 1 — which markers are drawn at all, at pin separation.
  const promotedNodes = declutter(nodeCandidates, {
    zoom: z,
    cellX: PIN_CELL_X,
    cellY: PIN_CELL_Y,
    cap,
    exempt: [...frameIds, ...defined(exemptNodeIds)],
  });
  const promotedWorkers = declutter(workerCandidates, {
    zoom: z,
    cellX: PIN_CELL_X,
    cellY: PIN_CELL_Y,
    cap,
    exempt: defined(exemptWorkerIds),
  });

  // Pass 2 — which of those also get their name, at label separation. Run over
  // the survivors only, so a label can never appear on a marker that is a dot.
  // No cap: the wider box is its own limit.
  const labelPass = (candidates: DeclutterCandidate[], promoted: Set<string>) =>
    declutter(
      candidates.filter((c) => promoted.has(c.id)),
      { zoom: z, cellX, cellY, cap: Number.POSITIVE_INFINITY }
    );

  return {
    promotedNodes,
    promotedWorkers,
    labelledNodes: labelPass(nodeCandidates, promotedNodes),
    labelledWorkers: labelPass(workerCandidates, promotedWorkers),
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
