import {
  ASSIGNMENT_SCOPE_RANK,
  type DisplayScope,
} from '../../../common/enums/assignment-scope.enum';

/** One current-shift assignment of a worker, as a map scope. */
export interface ScopeCandidate extends DisplayScope {
  /** A team membership (vs the worker's own individual assignment). */
  team: boolean;
}

export interface LivePlace {
  location_id: string | null;
  region_id: string | null;
  district_id: string | null;
}

const LIVE_KEY: Record<DisplayScope['scope'], keyof LivePlace | null> = {
  location: 'location_id',
  region: 'region_id',
  district: 'district_id',
  city: null,
};

/**
 * Where a worker with several current-shift assignments is drawn (ADR-064) —
 * once, at the place they are actually at:
 *  1. an assignment matching their live attributed place (lokasi, then kawasan,
 *     then rayon) — so "alone at A + with the team at B" shows at B while they
 *     are at B, and at A while at A;
 *  2. otherwise the deepest assignment, the INDIVIDUAL one before a team's
 *     (UAT: "show the individual first"), then the lowest id so the answer
 *     never depends on query order.
 */
export function pickDisplayScope(
  candidates: readonly ScopeCandidate[],
  live: LivePlace,
): DisplayScope | undefined {
  if (!candidates.length) return undefined;

  for (const scope of ['location', 'region', 'district'] as const) {
    const key = LIVE_KEY[scope];
    const here = key ? live[key] : null;
    const match = here && candidates.find((c) => c.scope === scope && c.scope_id === here);
    if (match) return { scope: match.scope, scope_id: match.scope_id };
  }

  const [best] = [...candidates].sort(
    (a, b) =>
      ASSIGNMENT_SCOPE_RANK[b.scope] - ASSIGNMENT_SCOPE_RANK[a.scope] ||
      Number(a.team) - Number(b.team) ||
      String(a.scope_id).localeCompare(String(b.scope_id)),
  );
  return { scope: best.scope, scope_id: best.scope_id };
}

/**
 * The ONE rostered lokasi a clocked-in worker's presence is credited to
 * (ADR-064): the lokasi they are attributed to when it is one of theirs,
 * otherwise the first rostered lokasi (stable order from the query).
 */
export function presenceLokasi(
  rostered: readonly string[],
  attributed: string | null,
): string | null {
  if (attributed && rostered.includes(attributed)) return attributed;
  return rostered[0] ?? null;
}
