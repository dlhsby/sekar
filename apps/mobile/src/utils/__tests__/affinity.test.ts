/**
 * Per-device affinity — the "places you looked at before" half of salience.
 *
 * The safety property is the CEILING. Affinity must reliably outrank a calm
 * peer and must never outrank a real outage, or the map starts showing the
 * operator their habits instead of their problems.
 */
import {
  affinityScore,
  recordVisit,
  pruneStore,
  parseStore,
  MAX_AFFINITY,
  HALF_LIFE_DAYS,
  MAX_TRACKED_ENTITIES,
  VISITS_PER_ENTITY,
  type AffinityStore,
} from '../affinity';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 7, 28, 12, 0, 0);

describe('affinityScore', () => {
  it('is zero for somewhere never visited', () => {
    expect(affinityScore(undefined, NOW)).toBe(0);
    expect(affinityScore([], NOW)).toBe(0);
  });

  it('halves over the half-life', () => {
    expect(affinityScore([NOW - HALF_LIFE_DAYS * DAY], NOW)).toBeCloseTo(
      affinityScore([NOW], NOW) / 2,
      6,
    );
  });

  it('decays with age, so last week beats last month', () => {
    const recent = affinityScore([NOW - DAY], NOW);
    const older = affinityScore([NOW - 30 * DAY], NOW);
    expect(recent).toBeGreaterThan(older);
    expect(older).toBeGreaterThan(0);
  });

  it('rewards repeat visits, not just recency', () => {
    expect(affinityScore([NOW - DAY, NOW - 2 * DAY], NOW)).toBeGreaterThan(
      affinityScore([NOW - DAY], NOW),
    );
  });

  it('never exceeds the ceiling, however obsessive the operator', () => {
    // THE safety property: urgency reaches ~20 on a real outage, so a bounded
    // affinity can break ties between quiet areas and nothing more.
    const obsessive = Array.from({ length: 500 }, (_, i) => NOW - i * 60_000);
    expect(affinityScore(obsessive, NOW)).toBeLessThanOrEqual(MAX_AFFINITY);
  });

  it('ignores timestamps from the future', () => {
    // Clock skew or a hand-edited store must not mint unbounded score.
    expect(affinityScore([NOW + 10 * DAY], NOW)).toBeLessThanOrEqual(
      affinityScore([NOW], NOW) + 1e-9,
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
    expect(store.a.length).toBeLessThanOrEqual(VISITS_PER_ENTITY);
  });

  it('keeps the NEWEST visits when it trims', () => {
    let store: AffinityStore = {};
    for (let i = 50; i >= 0; i--) store = recordVisit(store, 'a', NOW - i * DAY);
    expect(Math.max(...store.a)).toBe(NOW);
  });
});

describe('pruneStore', () => {
  it('drops entities not touched in a long time', () => {
    const pruned = pruneStore({ stale: [NOW - 400 * DAY], fresh: [NOW - DAY] }, NOW);
    expect(pruned.fresh).toBeDefined();
    expect(pruned.stale).toBeUndefined();
  });

  it('keeps only the most recently used entities when over the cap', () => {
    const store: AffinityStore = {};
    for (let i = 0; i < MAX_TRACKED_ENTITIES + 50; i++) store[`e${i}`] = [NOW - i * 1000];
    const pruned = pruneStore(store, NOW);
    expect(Object.keys(pruned).length).toBe(MAX_TRACKED_ENTITIES);
    expect(pruned.e0).toBeDefined();
  });

  it('does not mutate its input', () => {
    const store: AffinityStore = { stale: [NOW - 400 * DAY] };
    pruneStore(store, NOW);
    expect(store.stale).toBeDefined();
  });
});

describe('parseStore', () => {
  it('survives anything AsyncStorage hands back', () => {
    // The store outlives downgrades and can be hand-edited on a rooted device.
    // One malformed entry must not break the map.
    expect(parseStore(null)).toEqual({});
    expect(parseStore('not json')).toEqual({});
    expect(parseStore('[1,2,3]')).toEqual({});
    expect(parseStore('{"a":"nope"}')).toEqual({});
    expect(parseStore('{"a":[1,"x",2]}')).toEqual({ a: [1, 2] });
  });
});
