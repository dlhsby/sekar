/**
 * Tests for stationary-ping thinning.
 *
 * The safety property that matters most: thinning must never starve presence.
 * Monitoring derives ACTIVE/OFFLINE from the age of the newest ping, so a
 * heartbeat has to survive no matter how still the worker stands.
 */

import { isRedundantStationaryPing, DEFAULT_THINNING } from '../location-thinning.util';

const AT = new Date('2026-08-02T10:00:00.000Z');
const HERE = { lat: -7.2905, lng: 112.7398 };

/** A point `metres` north of HERE (1 deg latitude ≈ 111 km). */
const northOf = (metres: number) => ({
  lat: HERE.lat + metres / 111_000,
  lng: HERE.lng,
});

const at = (offsetMs: number) => new Date(AT.getTime() + offsetMs);

describe('isRedundantStationaryPing', () => {
  it('keeps the first ping — nothing to compare against', () => {
    expect(isRedundantStationaryPing({ ...HERE, at: AT }, null)).toBe(false);
  });

  it('drops a ping from the same spot moments later', () => {
    // The case that generates ~100 rows/hour from a worker standing still.
    const previous = { ...HERE, at: AT };
    expect(isRedundantStationaryPing({ ...HERE, at: at(30_000) }, previous)).toBe(true);
  });

  it('keeps a ping that actually moved', () => {
    const previous = { ...HERE, at: AT };
    expect(isRedundantStationaryPing({ ...northOf(100), at: at(30_000) }, previous)).toBe(false);
  });

  it('keeps a heartbeat even when perfectly stationary', () => {
    // Presence is derived from the newest ping's age. Thinning past the
    // heartbeat would make a present worker silently read OFFLINE.
    const previous = { ...HERE, at: AT };
    expect(
      isRedundantStationaryPing({ ...HERE, at: at(DEFAULT_THINNING.heartbeatMs) }, previous),
    ).toBe(false);
  });

  it('keeps the heartbeat well inside the 10-minute offline threshold', () => {
    // Guards the invariant rather than the number: if someone raises the
    // heartbeat past the monitoring threshold, this fails loudly.
    expect(DEFAULT_THINNING.heartbeatMs).toBeLessThan(5 * 60 * 1000);
  });

  it('tolerates ordinary GPS wander without treating it as movement', () => {
    // A stationary phone routinely reports ±10-20 m; if that counted as a move,
    // thinning would never fire.
    const previous = { ...HERE, at: AT };
    expect(isRedundantStationaryPing({ ...northOf(15), at: at(30_000) }, previous)).toBe(true);
  });

  it('treats a move just past the threshold as real', () => {
    const previous = { ...HERE, at: AT };
    expect(isRedundantStationaryPing({ ...northOf(30), at: at(30_000) }, previous)).toBe(false);
  });

  it('keeps out-of-order pings rather than guessing', () => {
    const previous = { ...HERE, at: at(60_000) };
    expect(isRedundantStationaryPing({ ...HERE, at: AT }, previous)).toBe(false);
  });

  it('keeps a ping with an identical timestamp', () => {
    const previous = { ...HERE, at: AT };
    expect(isRedundantStationaryPing({ ...HERE, at: AT }, previous)).toBe(false);
  });

  it('honours overridden thresholds', () => {
    const previous = { ...HERE, at: AT };
    // A 5 m radius makes the same 15 m wander count as movement.
    expect(
      isRedundantStationaryPing({ ...northOf(15), at: at(30_000) }, previous, {
        minMoveMeters: 5,
        heartbeatMs: 60_000,
      }),
    ).toBe(false);
  });
});
