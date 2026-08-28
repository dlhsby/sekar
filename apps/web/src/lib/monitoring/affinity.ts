'use client';

/**
 * Per-operator affinity — "the places this supervisor actually watches".
 *
 * The client's reference was Google Maps, which surfaces places you have looked
 * at before. Translated to a monitoring map: of two equally calm kawasan, the
 * one you drilled into three times this week is the one worth the pin.
 *
 * Two properties make this safe to put on an operational map:
 *
 *  1. **It is bounded** ({@link MAX_AFFINITY}). Urgency terms reach ~20 on a real
 *     outage; affinity tops out at 3. So familiarity can break a tie between two
 *     quiet areas and can NEVER outrank somewhere with nobody clocked in. A map
 *     that showed you your habits instead of your problems would be worse than
 *     one with no ranking at all.
 *  2. **It is per-browser and presentation-only** — same storage class as
 *     `hidden.ts` and the layer facets. It changes which pins are drawn in full;
 *     it never changes a count, and it never leaves the device.
 *
 * Storage is bounded on both axes: at most {@link VISITS_PER_ENTITY} timestamps
 * per place and {@link MAX_TRACKED_ENTITIES} places, pruned on write. A
 * supervisor who uses this map daily for a year must not accumulate an unbounded
 * localStorage entry.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

/** Visit timestamps (epoch ms), newest-last, keyed by entity id. */
export type AffinityStore = Record<string, number[]>;

export const AFFINITY_KEY = 'monitoring.affinity.v1';

/**
 * A visit's weight halves every this many days. Seven puts "yesterday" and
 * "last month" an order of magnitude apart while keeping a fortnight-old habit
 * faintly alive — the rhythm of a work roster, not of a news feed.
 */
export const HALF_LIFE_DAYS = 7;

/**
 * Score ceiling. Deliberately low: see property 1 above. Three is roughly
 * "visited three times in the last few days", which is as much as familiarity
 * should ever be worth against an actual staffing problem.
 */
export const MAX_AFFINITY = 3;

/** Timestamps kept per entity. Beyond this the extra visits add nothing under the cap. */
export const VISITS_PER_ENTITY = 20;

/** Entities tracked at once, most-recently-used kept. */
export const MAX_TRACKED_ENTITIES = 200;

/** A place untouched for this long is forgotten entirely. */
export const MAX_AGE_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Decayed visit count for one entity.
 *
 * Sum of `2^(−ageDays / HALF_LIFE_DAYS)` over its visits, clamped to
 * {@link MAX_AFFINITY}. Future-dated entries (clock skew, a hand-edited store)
 * are treated as "now" rather than trusted, so they cannot mint extra weight.
 */
export function affinityScore(visits: number[] | undefined, now: number): number {
  if (!visits || visits.length === 0) return 0;
  let total = 0;
  for (const t of visits) {
    if (!Number.isFinite(t)) continue;
    const ageDays = Math.max(0, (now - t) / DAY_MS);
    total += Math.pow(2, -ageDays / HALF_LIFE_DAYS);
  }
  return Math.min(total, MAX_AFFINITY);
}

/** Record a visit. Pure — returns a new store, never mutates the input. */
export function recordVisit(store: AffinityStore, id: string, now: number): AffinityStore {
  const existing = store[id] ?? [];
  // Newest-last, then trimmed from the FRONT so the recent history survives.
  const appended = [...existing, now].sort((a, b) => a - b);
  const trimmed =
    appended.length > VISITS_PER_ENTITY ? appended.slice(-VISITS_PER_ENTITY) : appended;
  return { ...store, [id]: trimmed };
}

/** Forget stale places and cap the total. Pure. */
export function pruneStore(store: AffinityStore, now: number): AffinityStore {
  const cutoff = now - MAX_AGE_DAYS * DAY_MS;
  const live = Object.entries(store)
    .map(([id, visits]) => ({ id, visits, last: Math.max(...visits, 0) }))
    .filter((e) => e.visits.length > 0 && e.last >= cutoff)
    .sort((a, b) => b.last - a.last)
    .slice(0, MAX_TRACKED_ENTITIES);

  const next: AffinityStore = {};
  for (const e of live) next[e.id] = e.visits;
  return next;
}

function readStored(): AffinityStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(AFFINITY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    // Sanitised on read: this survives downgrades and hand-edits, and one
    // malformed entry must not break the map.
    const clean: AffinityStore = {};
    for (const [id, visits] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(visits)) {
        const nums = visits.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
        if (nums.length > 0) clean[id] = nums.slice(-VISITS_PER_ENTITY);
      }
    }
    return clean;
  } catch {
    return {};
  }
}

function persist(store: AffinityStore): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AFFINITY_KEY, JSON.stringify(store));
  } catch {
    // A full or disabled localStorage costs the operator their personalisation,
    // never their map.
  }
}

export interface AffinityApi {
  /** Decayed familiarity for an entity id. 0 when never visited. */
  affinityOf: (id: string) => number;
  /** Note that the operator engaged with this entity (drill, detail, select, search). */
  visit: (id: string) => void;
}

/**
 * Affinity for the current browser.
 *
 * Scores are recomputed only when the store changes, not on a timer: the decay
 * has a seven-DAY half-life, so re-scoring mid-session would move nothing that
 * anyone could see, and the ranking must stay stable while the operator works.
 */
export function useAffinity(): AffinityApi {
  // The clock is captured WITH the store, never read during render.
  //
  // Scoring needs a "now" to measure ages against, but reading one while
  // rendering is impure: two components rendering in the same pass would decay
  // the same visit by different amounts, and the ranking could differ between
  // the map and anything else reading it. Stamping the time when the store
  // changes makes every score in a render derive from one instant.
  const [snapshot, setSnapshot] = useState<{ store: AffinityStore; at: number }>({
    store: {},
    at: 0,
  });
  // Reading the store inside `visit` via a ref keeps the callback identity
  // stable, so it can be passed into memoized marker builders without
  // invalidating them on every recorded visit.
  const storeRef = useRef<AffinityStore>(snapshot.store);

  useEffect(() => {
    const now = Date.now();
    const initial = pruneStore(readStored(), now);
    storeRef.current = initial;
    setSnapshot({ store: initial, at: now });
  }, []);

  const visit = useCallback((id: string) => {
    if (!id) return;
    const now = Date.now();
    const next = pruneStore(recordVisit(storeRef.current, id, now), now);
    storeRef.current = next;
    setSnapshot({ store: next, at: now });
    persist(next);
  }, []);

  const affinityOf = useCallback(
    (id: string) => affinityScore(snapshot.store[id], snapshot.at),
    [snapshot]
  );

  return { affinityOf, visit };
}
