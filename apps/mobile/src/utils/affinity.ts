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
 *  2. **It is per-device and presentation-only.** It changes which pins are
 *     drawn in full; it never changes a count, and it never leaves the phone.
 *
 * Mirrors web's `lib/monitoring/affinity.ts` — same weights, same bounds, same
 * pruning — so the two platforms rank the same data the same way. The only
 * divergence is the store: `AsyncStorage` is a promise where `localStorage` is
 * synchronous, so the hook loads once on mount and writes fire-and-forget.
 * Storage, not EncryptedStorage: this is a workspace preference, not a
 * credential, and it belongs beside the offline queue rather than the tokens.
 *
 * Storage is bounded on both axes: at most {@link VISITS_PER_ENTITY} timestamps
 * per place and {@link MAX_TRACKED_ENTITIES} places, pruned on write. A
 * supervisor who uses this map daily for a year must not accumulate an unbounded
 * localStorage entry.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

/**
 * Parse a stored payload, sanitising as it goes.
 *
 * Exported because it is the one part of the read path worth testing directly:
 * the store survives downgrades and can be hand-edited on a rooted device, and
 * a single malformed entry must not break the map.
 */
export function parseStore(raw: string | null): AffinityStore {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
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
/**
 * Affinity for this device.
 *
 * Loaded once on mount, written fire-and-forget on visit. `AsyncStorage` is a
 * promise where web's `localStorage` is synchronous, so persisting cannot sit in
 * the render path — and it does not need to: losing the last visit to a
 * backgrounded app costs the operator a tie-break, never data.
 *
 * The live store rides a ref as well as state, so a visit recorded from a marker
 * callback reads the CURRENT store rather than the one captured when that
 * callback was created.
 */
export function useAffinity(): AffinityApi {
  const [snapshot, setSnapshot] = useState<{ store: AffinityStore; at: number }>({
    store: {},
    at: 0,
  });
  const storeRef = useRef<AffinityStore>({});

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(AFFINITY_KEY)
      .then(raw => {
        if (cancelled) return;
        const now = Date.now();
        const loaded = pruneStore(parseStore(raw), now);
        storeRef.current = loaded;
        setSnapshot({ store: loaded, at: now });
      })
      .catch(() => {
        // A device that cannot read its own preferences still gets a map.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visit = useCallback((id: string) => {
    if (!id) return;
    const now = Date.now();
    const next = pruneStore(recordVisit(storeRef.current, id, now), now);
    storeRef.current = next;
    setSnapshot({ store: next, at: now });
    void AsyncStorage.setItem(AFFINITY_KEY, JSON.stringify(next)).catch(() => {
      // Best-effort; the in-memory store is already updated.
    });
  }, []);

  const affinityOf = useCallback(
    (id: string) => affinityScore(snapshot.store[id], snapshot.at),
    [snapshot],
  );

  return { affinityOf, visit };
}
