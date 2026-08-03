/**
 * Tests for client-side stationary thinning.
 *
 * Mirrors the server's rule, so the two must agree on the safety property:
 * a heartbeat always survives, because presence is derived server-side from the
 * age of the newest ping.
 */

import { shouldSkipStationaryPing, CLIENT_HEARTBEAT_MS } from '../pingThinning';

const AT = new Date('2026-08-03T01:00:00.000Z');
const HERE = { latitude: -7.2905, longitude: 112.7398 };
const FILTER_M = 25;

/** A point `metres` north of HERE (1 deg latitude ≈ 111 km). */
const northOf = (metres: number) => ({
  latitude: HERE.latitude + metres / 111_000,
  longitude: HERE.longitude,
});

const ref = (offsetMs = 0) => ({
  ...HERE,
  timestamp: new Date(AT.getTime() + offsetMs).toISOString(),
});

const candidate = (pos: { latitude: number; longitude: number }, offsetMs: number) => ({
  ...pos,
  capturedAtMs: AT.getTime() + offsetMs,
});

describe('shouldSkipStationaryPing', () => {
  it('is disabled by default so existing builds are unaffected', () => {
    // The historical behaviour: filter 0 means every fix is kept.
    expect(shouldSkipStationaryPing(candidate(HERE, 30_000), ref(), 0)).toBe(false);
  });

  it('keeps the first fix — nothing to compare against', () => {
    expect(shouldSkipStationaryPing(candidate(HERE, 0), null, FILTER_M)).toBe(false);
  });

  it('skips a fix from the same spot moments later', () => {
    expect(shouldSkipStationaryPing(candidate(HERE, 30_000), ref(), FILTER_M)).toBe(true);
  });

  it('keeps a fix that actually moved', () => {
    expect(shouldSkipStationaryPing(candidate(northOf(100), 30_000), ref(), FILTER_M)).toBe(false);
  });

  it('keeps the heartbeat even when perfectly stationary', () => {
    // Thinning past this would let a present worker read OFFLINE server-side.
    expect(
      shouldSkipStationaryPing(candidate(HERE, CLIENT_HEARTBEAT_MS), ref(), FILTER_M),
    ).toBe(false);
  });

  it('keeps the heartbeat well inside the 10-minute offline threshold', () => {
    // Guards the invariant, not the number.
    expect(CLIENT_HEARTBEAT_MS).toBeLessThan(5 * 60 * 1000);
  });

  it('tolerates ordinary GPS wander without calling it movement', () => {
    expect(shouldSkipStationaryPing(candidate(northOf(15), 30_000), ref(), FILTER_M)).toBe(true);
  });

  it('treats a move past the threshold as real', () => {
    expect(shouldSkipStationaryPing(candidate(northOf(40), 30_000), ref(), FILTER_M)).toBe(false);
  });

  it('keeps a fix whose timestamp is not after the reference', () => {
    expect(shouldSkipStationaryPing(candidate(HERE, -30_000), ref(), FILTER_M)).toBe(false);
    expect(shouldSkipStationaryPing(candidate(HERE, 0), ref(), FILTER_M)).toBe(false);
  });

  it('keeps a fix when the reference timestamp is unusable', () => {
    const bad = { ...HERE, timestamp: 'not-a-date' };
    expect(shouldSkipStationaryPing(candidate(HERE, 30_000), bad, FILTER_M)).toBe(false);
  });
});
