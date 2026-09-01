/**
 * AssignmentScope — the geographic scope a task or activity is bound to, mirroring
 * the monitoring drill tiers (ADR-046). A task/activity "follows the schedule": its
 * scope is derived from the assignee's / submitter's schedule occurrence, but it can
 * also stand alone (ad-hoc) at any tier — or carry no geographic binding at all.
 *
 * Ordering (deepest → shallowest) is meaningful: when several scope candidates apply
 * to one entity (e.g. a worker both scheduled at a location and running a district
 * task), the most-specific one wins. `none` = no binding (an ad-hoc task/activity for
 * an unscheduled worker with no location context).
 */
export enum AssignmentScope {
  CITY = 'city',
  DISTRICT = 'district',
  REGION = 'region',
  LOCATION = 'location',
  NONE = 'none',
}

export const ASSIGNMENT_SCOPES: readonly AssignmentScope[] = Object.values(AssignmentScope);

/** Specificity rank — higher is deeper/more-specific. Used for deepest-wins merges. */
export const ASSIGNMENT_SCOPE_RANK: Record<AssignmentScope, number> = {
  [AssignmentScope.LOCATION]: 4,
  [AssignmentScope.REGION]: 3,
  [AssignmentScope.DISTRICT]: 2,
  [AssignmentScope.CITY]: 1,
  [AssignmentScope.NONE]: 0,
};

/** A resolved scope binding: the tier plus the ids for every level down to it. */
export interface ResolvedScope {
  scope: AssignmentScope;
  district_id: string | null;
  region_id: string | null;
  location_id: string | null;
}

/**
 * A worker's monitoring map placement: the drill tier plus the id of the matching
 * node (null at city). The renderable tiers only — never `none`.
 */
export interface DisplayScope {
  scope: 'city' | 'district' | 'region' | 'location';
  scope_id: string | null;
}

/** Deepest-wins pick between display-scope candidates (higher rank = more specific). */
export function deeperDisplayScope(a: DisplayScope, b: DisplayScope): DisplayScope {
  return ASSIGNMENT_SCOPE_RANK[b.scope] > ASSIGNMENT_SCOPE_RANK[a.scope] ? b : a;
}

/** The empty/no-binding scope. */
export const NO_SCOPE: ResolvedScope = {
  scope: AssignmentScope.NONE,
  district_id: null,
  region_id: null,
  location_id: null,
};

/**
 * Collapse a set of ids into the deepest scope they express: a `location_id` implies
 * `location`, else `region_id` → `region`, else `district_id` → `district`, else
 * `city` when explicitly city-wide, else `none`. Never throws — callers pass whatever
 * ids they have and get a coherent binding back.
 */
export function scopeFromIds(ids: {
  district_id?: string | null;
  region_id?: string | null;
  location_id?: string | null;
  cityWide?: boolean;
}): ResolvedScope {
  if (ids.location_id) {
    return {
      scope: AssignmentScope.LOCATION,
      district_id: ids.district_id ?? null,
      region_id: ids.region_id ?? null,
      location_id: ids.location_id,
    };
  }
  if (ids.region_id) {
    return {
      scope: AssignmentScope.REGION,
      district_id: ids.district_id ?? null,
      region_id: ids.region_id,
      location_id: null,
    };
  }
  if (ids.district_id) {
    return {
      scope: AssignmentScope.DISTRICT,
      district_id: ids.district_id,
      region_id: null,
      location_id: null,
    };
  }
  if (ids.cityWide) {
    return { scope: AssignmentScope.CITY, district_id: null, region_id: null, location_id: null };
  }
  return NO_SCOPE;
}

/** Return whichever binding is deeper (higher rank); ties keep `a`. */
export function deeperScope(a: ResolvedScope, b: ResolvedScope): ResolvedScope {
  return ASSIGNMENT_SCOPE_RANK[b.scope] > ASSIGNMENT_SCOPE_RANK[a.scope] ? b : a;
}
