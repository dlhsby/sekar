/**
 * Per-operator affinity — the "places you looked at before" half of salience.
 *
 * The client asked for Google's behaviour: a map that remembers what you watch.
 * The safety property is the CEILING. Affinity must reliably outrank a calm
 * peer and must never outrank a real outage, or the map starts showing you your
 * habits instead of your problems.
 */
import {
  affinityScore,
  recordVisit,
  pruneStore,
  MAX_AFFINITY,
  HALF_LIFE_DAYS,
  MAX_TRACKED_ENTITIES,
  type AffinityStore,
} from '../affinity';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 7, 28, 12, 0, 0);

describe('affinityScore', () => {
  it('is zero for somewhere never visited', () => {
    expect(affinityScore(undefined, NOW)).toBe(0);
    expect(affinityScore([], NOW)).toBe(0);
  });

  it('decays with age, so last week beats last month', () => {
    const recent = affinityScore([NOW - 1 * DAY], NOW);
    const older = affinityScore([NOW - 30 * DAY], NOW);
    expect(recent).toBeGreaterThan(older);
    expect(older).toBeGreaterThan(0);
  });

  it('halves over the half-life', () => {
    const fresh = affinityScore([NOW], NOW);
    const aged = affinityScore([NOW - HALF_LIFE_DAYS * DAY], NOW);
    expect(aged).toBeCloseTo(fresh / 2, 6);
  });

  it('rewards repeat visits, not just recency', () => {
    const once = affinityScore([NOW - DAY], NOW);
    const often = affinityScore([NOW - DAY, NOW - 2 * DAY, NOW - 3 * DAY], NOW);
    expect(often).toBeGreaterThan(once);
  });

  it('never exceeds the ceiling, however obsessive the operator', () => {
    // THE safety property. Urgency terms reach ~20 on a real outage; affinity
    // is capped low enough that a familiar-but-calm area can outrank another
    // calm area and nothing else.
    const obsessive = Array.from({ length: 500 }, (_, i) => NOW - i * 60 * 1000);
    expect(affinityScore(obsessive, NOW)).toBeLessThanOrEqual(MAX_AFFINITY);
  });

  it('ignores timestamps from the future', () => {
    // A clock skew or a hand-edited localStorage must not mint unbounded score.
    expect(affinityScore([NOW + 10 * DAY], NOW)).toBeLessThanOrEqual(
      affinityScore([NOW], NOW) + 1e-9
    );
  });
});

describe('recordVisit', () => {
  it('returns a new store and never mutates the input', () => {
    const before: AffinityStore = { a: [1] };
    const after = recordVisit(before, 'a', NOW);
    expect(before).toEqual({ a: [1] });
    expect(after).not.toBe(before);
    expect(after.a).toContain(NOW);
  });

  it('caps the visit list per entity so storage cannot grow without bound', () => {
    let store: AffinityStore = {};
    for (let i = 0; i < 200; i++) store = recordVisit(store, 'a', NOW - i * 1000);
    expect(store.a.length).toBeLessThanOrEqual(20);
  });

  it('keeps the NEWEST visits when it trims', () => {
    let store: AffinityStore = {};
    for (let i = 50; i >= 0; i--) store = recordVisit(store, 'a', NOW - i * DAY);
    expect(Math.max(...store.a)).toBe(NOW);
  });
});

describe('pruneStore', () => {
  it('drops entities not touched in a long time', () => {
    const store: AffinityStore = { stale: [NOW - 400 * DAY], fresh: [NOW - DAY] };
    const pruned = pruneStore(store, NOW);
    expect(pruned.fresh).toBeDefined();
    expect(pruned.stale).toBeUndefined();
  });

  it('keeps only the most recently used entities when over the cap', () => {
    const store: AffinityStore = {};
    for (let i = 0; i < MAX_TRACKED_ENTITIES + 50; i++) store[`e${i}`] = [NOW - i * 1000];
    const pruned = pruneStore(store, NOW);
    expect(Object.keys(pruned).length).toBe(MAX_TRACKED_ENTITIES);
    expect(pruned.e0).toBeDefined(); // newest survives
    expect(pruned[`e${MAX_TRACKED_ENTITIES + 49}`]).toBeUndefined(); // oldest does not
  });

  it('does not mutate its input', () => {
    const store: AffinityStore = { stale: [NOW - 400 * DAY] };
    pruneStore(store, NOW);
    expect(store.stale).toBeDefined();
  });
});
