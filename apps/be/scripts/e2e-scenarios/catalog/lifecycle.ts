/**
 * Presence lifecycle + the rest of the tier matrix — ADR-050 axis 1, ADR-046.
 *
 * The tier scenarios complete what MON-11 started: a guard applied at one tier
 * and not the others is the bug that shipped twice, so kawasan, rayon and city
 * each get their own case rather than being assumed to follow from lokasi.
 */

import type { Scenario } from '../types';
import { workerById, rosterRowsFor } from './assertions';

/** Present on the map at `scope`, with the display scope the occurrence implies. */
function visibleAt(scope: 'city' | 'district' | 'region' | 'location') {
  return {
    what: `renders at ${scope} scope`,
    get: ({ subject }: { subject: { locationId: string | null; districtId: string | null; regionId: string | null } }) =>
      scope === 'city'
        ? '/monitoring/snapshot?scope=city'
        : scope === 'location'
          ? `/monitoring/snapshot?scope=location&id=${subject.locationId}`
          : scope === 'region'
            ? `/monitoring/snapshot?scope=region&id=${subject.regionId}`
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

export const LIFECYCLE: Scenario[] = [
  {
    id: 'MON-12',
    domain: 'monitoring',
    title: 'A kawasan-scheduled worker shows at their kawasan tier',
    proves: 'ADR-046 — a mobile (region-scoped) occurrence places the worker at kawasan',
    subject: { handle: 'mon_kawasan', role: 'satgas', scope: 'region' },
    async arrange({ helpers, subject, today, now }) {
      const shift = await helpers.currentShiftDefId();
      // region_id and NO location_id — that is what makes the occurrence mobile.
      await helpers.schedule({
        userId: subject.userId, date: today, shiftDefinitionId: shift,
        regionId: subject.regionId, districtId: subject.districtId,
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
    expect: [visibleAt('region')],
  },

  {
    id: 'MON-13',
    domain: 'monitoring',
    title: 'A rayon-scheduled worker shows at their rayon tier',
    proves: 'ADR-046 — a district-scoped occurrence places the worker at rayon',
    subject: { handle: 'mon_rayon', role: 'satgas', scope: 'district' },
    async arrange({ helpers, subject, today, now }) {
      const shift = await helpers.currentShiftDefId();
      // District only — no lokasi, no kawasan.
      await helpers.schedule({
        userId: subject.userId, date: today, shiftDefinitionId: shift,
        districtId: subject.districtId,
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
    expect: [visibleAt('district')],
  },

  {
    id: 'MON-03',
    domain: 'monitoring',
    title: 'Scheduled but never clocked in reads as awaiting/late, not on duty',
    proves: 'ADR-050 axis 1 — belum_hadir / terlambat are roster states, not map pins',
    subject: { handle: 'mon_notin', role: 'satgas', scope: 'location' },
    async arrange({ helpers, subject, today }) {
      // A roster row and deliberately NO punch.
      await helpers.schedule({
        userId: subject.userId, date: today,
        shiftDefinitionId: await helpers.currentShiftDefId(),
        locationId: subject.locationId, districtId: subject.districtId,
      });
    },
    expect: [
      {
        what: 'on the roster for today',
        get: ({ today }) => `/schedules/date/${today}`,
        check: (body, ctx) =>
          rosterRowsFor(body, ctx.subject.userId).length > 0
            ? null
            : 'the scheduled worker is missing from the roster',
      },
      {
        what: 'NOT a live pin — only bertugas renders on the map',
        get: () => '/monitoring/snapshot?scope=city',
        check: (body, ctx) =>
          workerById(body, ctx.subject.userId)
            ? 'a worker who never clocked in must not render as a live pin'
            : null,
      },
    ],
  },

  {
    id: 'MON-05',
    domain: 'monitoring',
    title: 'After clock-out the worker leaves the live map',
    proves: 'ADR-050 — pulang lives in history, never as a live pin',
    subject: { handle: 'mon_pulang', role: 'satgas', scope: 'location' },
    async arrange({ helpers, subject, today, now }) {
      const shift = await helpers.currentShiftDefId();
      await helpers.schedule({
        userId: subject.userId, date: today, shiftDefinitionId: shift,
        locationId: subject.locationId, districtId: subject.districtId,
      });
      await helpers.punch({
        userId: subject.userId, label: 'clock_in',
        at: new Date(now.getTime() - 120 * 60_000),
        serviceDay: today, shiftDefinitionId: shift, locationId: subject.locationId,
      });
      await helpers.punch({
        userId: subject.userId, label: 'clock_out',
        at: new Date(now.getTime() - 5 * 60_000),
        serviceDay: today, shiftDefinitionId: shift, locationId: subject.locationId,
      });
      // Tracking still carries a fresh fix — only the closed session should
      // remove them, exactly as for the phantom case.
      await helpers.track({
        userId: subject.userId, locationId: subject.locationId,
        districtId: subject.districtId, lastLocationAt: new Date(now.getTime() - 60_000),
      });
    },
    expect: [
      {
        what: 'absent from the live map after clocking out',
        get: () => '/monitoring/snapshot?scope=city',
        check: (body, ctx) =>
          workerById(body, ctx.subject.userId)
            ? 'a clocked-out worker must not remain a live pin'
            : null,
      },
    ],
  },

  {
    id: 'MON-17',
    domain: 'monitoring',
    title: 'staff_kecamatan never appears on the map',
    proves: 'ADR-032/033 — an external, non-clockable role is not a field worker',
    subject: { handle: 'mon_kecamatan', role: 'staff_kecamatan', scope: 'city' },
    async arrange({ helpers, subject, now }) {
      // Give them a tracking row anyway: the role, not the absence of data, is
      // what must keep them off the map.
      await helpers.track({
        userId: subject.userId, locationId: subject.locationId,
        districtId: subject.districtId, lastLocationAt: new Date(now.getTime() - 60_000),
      });
    },
    expect: [
      {
        what: 'absent from the city map',
        get: () => '/monitoring/snapshot?scope=city',
        check: (body, ctx) =>
          workerById(body, ctx.subject.userId)
            ? 'a non-clockable role must never render on the live map'
            : null,
      },
    ],
  },
];
