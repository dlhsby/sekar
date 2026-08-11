/**
 * Monitoring scenarios — ADR-050 (presence axes), ADR-046 (subject model), and
 * the per-tier liveness work.
 *
 * The tier-placement scenarios are the ones worth having: they are asserted at
 * EVERY drill level, because a guard applied at one tier and not the others is
 * exactly the bug that shipped twice.
 */

import type { Scenario } from '../types';
import { workerById, snapshotWorkers } from './assertions';

/** Assert the subject is visible at one scope and absent from the others. */
function onlyVisibleAt(scope: 'city' | 'district' | 'region' | 'location') {
  return {
    what: `renders at ${scope} scope and nowhere else`,
    get: ({ subject }: { subject: { locationId: string | null; districtId: string | null } }) =>
      scope === 'city'
        ? '/monitoring/snapshot?scope=city'
        : scope === 'location'
          ? `/monitoring/snapshot?scope=location&id=${subject.locationId}`
          : `/monitoring/snapshot?scope=district&id=${subject.districtId}`,
    check: (body: unknown, ctx: { subject: { userId: string } }) => {
      const w = workerById(body, ctx.subject.userId);
      if (!w) return `subject is missing from the ${scope} payload`;
      if (w.display_scope !== scope)
        return `display_scope is "${w.display_scope}", expected "${scope}"`;
      return null;
    },
  };
}

export const MONITORING: Scenario[] = [
  {
    id: 'MON-11',
    domain: 'monitoring',
    title: 'A lokasi-scheduled worker shows at their lokasi tier',
    proves: 'ADR-046 — display_scope comes from the schedule occurrence, not the geography',
    subject: { handle: 'mon_loc', role: 'satgas', scope: 'location' },
    async arrange({ helpers, subject, today, now }) {
      const shift = await helpers.currentShiftDefId();
      await helpers.schedule({
        userId: subject.userId, date: today, shiftDefinitionId: shift,
        locationId: subject.locationId, districtId: subject.districtId,
      });
      await helpers.punch({
        userId: subject.userId, label: 'clock_in',
        at: new Date(now.getTime() - 20 * 60_000),
        serviceDay: today, shiftDefinitionId: shift, locationId: subject.locationId,
      });
      await helpers.track({
        userId: subject.userId, locationId: subject.locationId,
        districtId: subject.districtId, lastLocationAt: new Date(now.getTime() - 60_000),
      });
    },
    expect: [onlyVisibleAt('location')],
  },

  {
    id: 'MON-15',
    domain: 'monitoring',
    title: 'An unscheduled clock-in is pinned to CITY with the ad_hoc flag',
    proves: 'ADR-054 — ad-hoc workers surface at city with a distinct indicator, never counted',
    subject: { handle: 'mon_adhoc', role: 'satgas', scope: 'city' },
    async arrange({ helpers, subject, today, now }) {
      // Deliberately NO schedule row — that is what makes the clock-in ad-hoc.
      const shift = await helpers.currentShiftDefId();
      await helpers.punch({
        userId: subject.userId, label: 'clock_in',
        at: new Date(now.getTime() - 15 * 60_000),
        serviceDay: today, shiftDefinitionId: shift, locationId: subject.locationId,
      });
      await helpers.track({
        userId: subject.userId, locationId: subject.locationId,
        districtId: subject.districtId, lastLocationAt: new Date(now.getTime() - 60_000),
      });
    },
    expect: [
      {
        what: 'appears at city scope as ad_hoc and not scheduled',
        get: () => '/monitoring/snapshot?scope=city',
        check: (body, ctx) => {
          const w = workerById(body, ctx.subject.userId);
          if (!w) return 'an ad-hoc worker must still be visible at city scope';
          if (w.display_scope !== 'city')
            return `ad-hoc must be pinned to city, got "${w.display_scope}"`;
          if (w.is_scheduled !== false) return 'is_scheduled must be false for an ad-hoc clock-in';
          if (!w.lifecycle_flags?.includes('ad_hoc'))
            return `missing the ad_hoc flag — flags were ${JSON.stringify(w.lifecycle_flags)}`;
          return null;
        },
      },
    ],
  },

  {
    id: 'MON-18',
    domain: 'monitoring',
    title: 'A phantom session is invisible at EVERY tier',
    proves: 'a tracking row pointing at a CLOSED shift is not a worker on duty',
    guards: 'regression: 302 phantom workers on the live map with nobody on duty',
    subject: { handle: 'mon_phantom', role: 'satgas', scope: 'location' },
    async arrange({ helpers, subject, today, ds }) {
      // A session that ended days ago…
      const shift = await helpers.shiftDefId('Shift 1');
      const past = new Date(new Date(`${today}T00:00:00Z`).getTime() - 4 * 86_400_000)
        .toISOString()
        .split('T')[0];
      await helpers.punch({
        userId: subject.userId, label: 'clock_in', at: helpers.wibAt(past, '06:00'),
        serviceDay: past, shiftDefinitionId: shift, locationId: subject.locationId,
      });
      await helpers.punch({
        userId: subject.userId, label: 'clock_out', at: helpers.wibAt(past, '14:00'),
        serviceDay: past, shiftDefinitionId: shift, locationId: subject.locationId,
      });
      // …with a tracking row still pointing at it and a FRESH fix, so only the
      // liveness guard can exclude it — recency cannot.
      const [closed] = (await ds.query(
        `SELECT id FROM shifts WHERE user_id = $1 AND service_day = $2 LIMIT 1`,
        [subject.userId, past],
      )) as Array<{ id: string }>;
      await ds.query(
        `INSERT INTO user_tracking_status
           (user_id, shift_id, location_id, district_id, status, is_within_area,
            last_latitude, last_longitude, last_location_at, updated_at)
         VALUES ($1,$2,$3,$4,'active',true,-7.2905,112.7398, now(), now())
         ON CONFLICT (user_id) DO UPDATE SET shift_id = EXCLUDED.shift_id,
           location_id = EXCLUDED.location_id, district_id = EXCLUDED.district_id,
           status = 'active', last_location_at = now(), updated_at = now()`,
        [subject.userId, closed?.id ?? null, subject.locationId, subject.districtId],
      );
    },
    expect: [
      {
        what: 'absent from the city map',
        get: () => '/monitoring/snapshot?scope=city',
        check: (body, ctx) =>
          workerById(body, ctx.subject.userId)
            ? 'a closed session must not render at city scope'
            : null,
      },
      {
        what: 'absent from the rayon map',
        get: ({ subject }) => `/monitoring/snapshot?scope=district&id=${subject.districtId}`,
        check: (body, ctx) =>
          workerById(body, ctx.subject.userId)
            ? 'a closed session must not render at rayon scope'
            : null,
      },
      {
        what: 'absent from the lokasi map',
        get: ({ subject }) => `/monitoring/snapshot?scope=location&id=${subject.locationId}`,
        check: (body, ctx) =>
          workerById(body, ctx.subject.userId)
            ? 'a closed session must not render at lokasi scope'
            : null,
      },
      {
        what: 'absent from live-users',
        get: () => '/monitoring/live-users',
        check: (body, ctx) => {
          const users = snapshotWorkers(body);
          // live-users keys on `id`, not `user_id`.
          const raw = (body as { data?: { users?: Array<{ id: string }> } })?.data?.users ?? [];
          const hit = raw.some((u) => u.id === ctx.subject.userId) ||
            users.some((u) => u.user_id === ctx.subject.userId);
          return hit ? 'a closed session must not appear in live-users' : null;
        },
      },
    ],
  },
];
