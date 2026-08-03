/**
 * Tests for the shared location-integrity evaluator.
 *
 * This is the single place the rules live, so it carries the detailed coverage;
 * the two consumers (punches, pings) then only need to prove they call it and
 * honour the verdict.
 */

import {
  evaluateLocation,
  impliedSpeedKmh,
  LocationRejection,
  DEFAULT_INTEGRITY_THRESHOLDS,
} from '../location-integrity.util';

const NOW = new Date('2026-08-02T10:00:00.000Z');

/** Taman Bungkul, Surabaya. */
const SURABAYA = { lat: -7.2905, lng: 112.7398 };

describe('evaluateLocation', () => {
  describe('null island', () => {
    it('rejects exactly (0,0) — the shape a missing fix actually takes', () => {
      // gps_lat/gps_lng are already required by the DTO, so a fix never arrives
      // absent; it arrives as zeroes.
      const verdict = evaluateLocation({ lat: 0, lng: 0 }, { now: NOW });

      expect(verdict.accepted).toBe(false);
      expect(verdict.rejection).toBe(LocationRejection.MISSING_COORDINATES);
    });

    it('accepts a real coordinate that merely has a zero component', () => {
      // The equator and the prime meridian are real places; only the exact
      // intersection is the sentinel.
      expect(evaluateLocation({ lat: 0, lng: 112.7398 }, { now: NOW }).accepted).toBe(true);
      expect(evaluateLocation({ lat: -7.2905, lng: 0 }, { now: NOW }).accepted).toBe(true);
    });
  });

  describe('mocked fixes', () => {
    it('rejects a fix the client reports as mocked', () => {
      const verdict = evaluateLocation({ ...SURABAYA, isMocked: true }, { now: NOW });

      expect(verdict.accepted).toBe(false);
      expect(verdict.rejection).toBe(LocationRejection.MOCKED);
    });

    it.each([false, null, undefined])('accepts when isMocked is %p', (isMocked) => {
      expect(evaluateLocation({ ...SURABAYA, isMocked }, { now: NOW }).accepted).toBe(true);
    });

    it('still applies geometric checks when the client claims it is clean', () => {
      // A patched APK can always send isMocked:false, so the checks that do not
      // depend on the client's word must keep running.
      const verdict = evaluateLocation({ lat: 0, lng: 0, isMocked: false }, { now: NOW });

      expect(verdict.rejection).toBe(LocationRejection.MISSING_COORDINATES);
    });
  });

  describe('timestamp clamping', () => {
    it('clamps a future claim back to now', () => {
      const future = new Date(NOW.getTime() + 60 * 60 * 1000);
      const verdict = evaluateLocation({ ...SURABAYA, clientTimestamp: future }, { now: NOW });

      expect(verdict.effectiveTimestamp).toEqual(NOW);
      expect(verdict.advisories.clockSkewMs).toBe(60 * 60 * 1000);
    });

    it('clamps an over-old backdate to the floor — the hole that existed before', () => {
      // resolvePunchedAt only ever clamped the future, so a device with its
      // clock rolled back could claim a punch from any point in the past.
      const ancient = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000);
      const verdict = evaluateLocation({ ...SURABAYA, clientTimestamp: ancient }, { now: NOW });

      const floor = new Date(NOW.getTime() - DEFAULT_INTEGRITY_THRESHOLDS.maxBackdateMs);
      expect(verdict.effectiveTimestamp).toEqual(floor);
      // The untouched claim stays visible even though the stored value moved.
      expect(verdict.advisories.clockSkewMs).toBe(ancient.getTime() - NOW.getTime());
    });

    it('preserves a legitimate offline backdate inside the window', () => {
      // A worker with no signal all shift must still be able to sync afterwards.
      const sixHoursAgo = new Date(NOW.getTime() - 6 * 60 * 60 * 1000);
      const verdict = evaluateLocation({ ...SURABAYA, clientTimestamp: sixHoursAgo }, { now: NOW });

      expect(verdict.effectiveTimestamp).toEqual(sixHoursAgo);
      expect(verdict.accepted).toBe(true);
    });

    it('falls back to now when the client sends nothing or nonsense', () => {
      expect(evaluateLocation(SURABAYA, { now: NOW }).effectiveTimestamp).toEqual(NOW);
      expect(
        evaluateLocation({ ...SURABAYA, clientTimestamp: new Date('nope') }, { now: NOW })
          .effectiveTimestamp,
      ).toEqual(NOW);
    });

    it('does not reject on clock skew alone — it clamps and flags', () => {
      // Rejecting would discard genuine offline punches from devices with a
      // drifting clock, which is common on cheap hardware.
      const ancient = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000);
      expect(
        evaluateLocation({ ...SURABAYA, clientTimestamp: ancient }, { now: NOW }).accepted,
      ).toBe(true);
    });
  });

  describe('impossible travel', () => {
    /** ~111 km north of the Surabaya fixture (1 degree of latitude). */
    const ONE_DEGREE_NORTH = { lat: -6.2905, lng: 112.7398 };

    it('rejects a jump that implies an impossible ground speed', () => {
      const verdict = evaluateLocation(ONE_DEGREE_NORTH, {
        now: NOW,
        previous: { ...SURABAYA, at: new Date(NOW.getTime() - 60 * 1000) }, // 111 km in 1 min
      });

      expect(verdict.accepted).toBe(false);
      expect(verdict.rejection).toBe(LocationRejection.IMPOSSIBLE_TRAVEL);
      expect(verdict.advisories.impliedSpeedKmh).toBeGreaterThan(1000);
    });

    it('accepts ordinary vehicle travel between parks', () => {
      // Field staff genuinely drive between sites; the ceiling must clear that.
      const verdict = evaluateLocation(ONE_DEGREE_NORTH, {
        now: NOW,
        previous: { ...SURABAYA, at: new Date(NOW.getTime() - 2 * 60 * 60 * 1000) }, // ~55 km/h
      });

      expect(verdict.accepted).toBe(true);
      expect(verdict.advisories.impliedSpeedKmh).toBeLessThan(100);
    });

    it('ignores speed over a very short interval, so jitter cannot trip it', () => {
      // Two fixes a second apart with ordinary GPS wander imply a huge speed
      // while the worker is standing still.
      const jittered = { lat: SURABAYA.lat + 0.0003, lng: SURABAYA.lng };
      const verdict = evaluateLocation(jittered, {
        now: NOW,
        previous: { ...SURABAYA, at: new Date(NOW.getTime() - 1000) },
      });

      expect(verdict.accepted).toBe(true);
      expect(verdict.advisories.impliedSpeedKmh).toBeNull();
    });

    it('skips the check entirely with no previous fix', () => {
      const verdict = evaluateLocation(ONE_DEGREE_NORTH, { now: NOW, previous: null });

      expect(verdict.accepted).toBe(true);
      expect(verdict.advisories.impliedSpeedKmh).toBeNull();
    });

    it('measures speed against the CLAMPED time, not the client claim', () => {
      // Otherwise a backdated timestamp would inflate the elapsed interval and
      // make any jump look slow enough to pass.
      const verdict = evaluateLocation(
        { ...ONE_DEGREE_NORTH, clientTimestamp: new Date(NOW.getTime() - 90 * 24 * 3600 * 1000) },
        { now: NOW, previous: { ...SURABAYA, at: new Date(NOW.getTime() - 60 * 1000) } },
      );

      // The claim was clamped to the 24h floor, which is BEFORE the previous
      // fix, so the interval is negative and no bogus "slow" speed is derived.
      expect(verdict.advisories.impliedSpeedKmh).toBeNull();
    });
  });

  describe('accuracy advisory', () => {
    it('flags a poor fix but does not reject it', () => {
      // Tree canopy is the tree-canopy case: a bad fix from an honest worker.
      const verdict = evaluateLocation({ ...SURABAYA, accuracyMeters: 500 }, { now: NOW });

      expect(verdict.accepted).toBe(true);
      expect(verdict.advisories.poorAccuracy).toBe(true);
    });

    it('treats absent accuracy as poor rather than excellent', () => {
      expect(evaluateLocation(SURABAYA, { now: NOW }).advisories.poorAccuracy).toBe(true);
    });

    it('does not flag a good fix', () => {
      expect(
        evaluateLocation({ ...SURABAYA, accuracyMeters: 8 }, { now: NOW }).advisories.poorAccuracy,
      ).toBe(false);
    });

    it('never lets claimed-poor accuracy bypass a rejection', () => {
      // Otherwise a spoofer would simply claim a terrible accuracy to look like
      // an honest worker under canopy.
      const verdict = evaluateLocation(
        { ...SURABAYA, accuracyMeters: 9999, isMocked: true },
        { now: NOW },
      );

      expect(verdict.accepted).toBe(false);
      expect(verdict.rejection).toBe(LocationRejection.MOCKED);
    });
  });

  describe('rejection precedence', () => {
    it('reports missing coordinates ahead of a mock flag', () => {
      const verdict = evaluateLocation({ lat: 0, lng: 0, isMocked: true }, { now: NOW });
      expect(verdict.rejection).toBe(LocationRejection.MISSING_COORDINATES);
    });

    it('reports a mock flag ahead of impossible travel', () => {
      const verdict = evaluateLocation(
        { lat: -6.2905, lng: 112.7398, isMocked: true },
        { now: NOW, previous: { ...SURABAYA, at: new Date(NOW.getTime() - 60 * 1000) } },
      );
      expect(verdict.rejection).toBe(LocationRejection.MOCKED);
    });
  });
});

describe('impliedSpeedKmh', () => {
  it('returns null when the interval is below the floor', () => {
    expect(
      impliedSpeedKmh(SURABAYA, NOW, { ...SURABAYA, at: new Date(NOW.getTime() - 5000) }, 30_000),
    ).toBeNull();
  });

  it('computes a plausible speed for a real leg', () => {
    // ~111 km in exactly 1 hour.
    const speed = impliedSpeedKmh(
      { lat: -6.2905, lng: 112.7398 },
      NOW,
      { ...SURABAYA, at: new Date(NOW.getTime() - 3600 * 1000) },
      30_000,
    );

    expect(speed).toBeGreaterThan(105);
    expect(speed).toBeLessThan(115);
  });
});
