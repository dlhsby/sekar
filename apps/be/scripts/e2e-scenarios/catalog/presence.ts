/**
 * The 22 demo presence personas — the replacement for
 * `scripts/stage-presence-scenarios.ts` (retired).
 *
 * Each ADOPTS the seeder-created account of the same name, so
 * `specs/testing/manual-uat.md` still walks a tester through
 * `satgas_bertugas_1`, `satgas_cuti_1` and friends, and the names stay
 * self-describing on the monitoring map.
 *
 * What changes is how the state arrives: the retired stager wrote `shifts` rows
 * directly and no punches at all, so every persona had an empty Log Kehadiran
 * and no derivable Jam Masuk/Keluar. These arrange from PUNCHES, and the session
 * is derived by the production service — so what a tester opens is what a real
 * clock-in produces.
 */

import type { Scenario, ArrangeContext } from '../types';
import { workerById, rosterRowsFor, sessionsFor } from './assertions';

/** Roster the persona on the shift that is current now, at their own lokasi. */
async function roster(ctx: ArrangeContext, status = 'planned'): Promise<string> {
  const { helpers, subject, today } = ctx;
  const shift = await helpers.currentShiftDefId();
  await helpers.schedule({
    userId: subject.userId,
    date: today,
    shiftDefinitionId: shift,
    status,
    locationId: subject.locationId,
    districtId: subject.districtId,
  });
  return shift;
}

/** Clock in `minutesAgo` before now and point the tracking row at the session. */
async function onDuty(
  ctx: ArrangeContext,
  minutesAgo: number,
  opts: { outsideBoundary?: boolean; fixAgeMinutes?: number; withinArea?: boolean } = {},
): Promise<string> {
  const { helpers, subject, today, now } = ctx;
  const shift = await roster(ctx);
  await helpers.punch({
    userId: subject.userId,
    label: 'clock_in',
    at: new Date(now.getTime() - minutesAgo * 60_000),
    serviceDay: today,
    shiftDefinitionId: shift,
    locationId: subject.locationId,
    outsideBoundary: opts.outsideBoundary,
  });
  await helpers.track({
    userId: subject.userId,
    locationId: subject.locationId,
    districtId: subject.districtId,
    withinArea: opts.withinArea ?? !opts.outsideBoundary,
    lastLocationAt: new Date(now.getTime() - (opts.fixAgeMinutes ?? 1) * 60_000),
    status: (opts.fixAgeMinutes ?? 1) > 10 ? 'offline' : 'active',
  });
  return shift;
}

/** Present on the live map. */
const onMap = (why: string) => ({
  what: why,
  get: () => '/monitoring/snapshot?scope=city',
  check: (body: unknown, ctx: { subject: { userId: string } }) =>
    workerById(body, ctx.subject.userId) ? null : 'expected this persona to be a live pin',
});

/** Absent from the live map — the roster/history panel is where they belong. */
const offMap = (why: string) => ({
  what: why,
  get: () => '/monitoring/snapshot?scope=city',
  check: (body: unknown, ctx: { subject: { userId: string } }) =>
    workerById(body, ctx.subject.userId) ? 'expected this persona NOT to be a live pin' : null,
});

/** A roster row exists today with the given status. */
const rosterStatus = (status: string) => ({
  what: `roster row reads ${status}`,
  get: ({ today }: { today: string }) => `/schedules/date/${today}`,
  check: (body: unknown, ctx: { subject: { userId: string } }) => {
    const rows = rosterRowsFor(body, ctx.subject.userId);
    if (rows.length === 0) return 'no roster row for today';
    return rows.some((r) => r.status === status)
      ? null
      : `statuses were ${rows.map((r) => r.status).join(',')}, expected ${status}`;
  },
});

/** The punch log derives a session — the property the old stager could not give. */
const hasDerivedSession = {
  what: 'the punch log derives a session (Jam Masuk present)',
  get: ({ today }: { today: string }) => `/shifts/attendance/${today}/punches`,
  as: 'worker' as const,
  check: (body: unknown) => {
    const s = sessionsFor(body);
    if (s.length === 0) return 'no session derived — the persona has no punches behind it';
    return s[0].jam_masuk ? null : 'jam_masuk did not derive';
  },
};

export const PRESENCE: Scenario[] = [
  {
    id: 'PER-01',
    domain: 'monitoring',
    title: 'satgas_bertugas_1 — on duty, in area, fresh fix',
    proves: 'ADR-050 — the baseline live state',
    subject: { handle: 'bertugas', role: 'satgas', scope: 'location', adopt: 'satgas_bertugas_1' },
    arrange: (ctx) => onDuty(ctx, 60).then(() => undefined),
    expect: [onMap('renders as a live pin'), hasDerivedSession],
  },
  {
    id: 'PER-02',
    domain: 'monitoring',
    title: 'satgas_terlambat_in_1 — clocked in late',
    proves: 'ADR-050 catalog 6 — late badge, still counted',
    subject: {
      handle: 'terlambat_in',
      role: 'satgas',
      scope: 'location',
      adopt: 'satgas_terlambat_in_1',
    },
    arrange: (ctx) => onDuty(ctx, 5).then(() => undefined),
    expect: [onMap('a late arrival is still on duty'), hasDerivedSession],
  },
  {
    id: 'PER-03',
    domain: 'monitoring',
    title: 'satgas_luar_area_1 — on duty but outside the boundary',
    proves: 'ADR-050 axis 2 — outside is a ring, never a removal',
    subject: {
      handle: 'luar_area',
      role: 'satgas',
      scope: 'location',
      adopt: 'satgas_luar_area_1',
    },
    arrange: (ctx) => onDuty(ctx, 45, { outsideBoundary: true, withinArea: false }).then(() => undefined),
    expect: [onMap('an out-of-area worker is still a live pin')],
  },
  {
    id: 'PER-04',
    domain: 'monitoring',
    title: 'satgas_offline_1 — on duty, GPS stale',
    proves: 'ADR-050 axis 2 — offline keeps the pin at its last-known position',
    subject: { handle: 'offline', role: 'satgas', scope: 'location', adopt: 'satgas_offline_1' },
    arrange: (ctx) => onDuty(ctx, 90, { fixAgeMinutes: 45 }).then(() => undefined),
    expect: [onMap('an unreachable worker is still on duty')],
  },
  {
    id: 'PER-05',
    domain: 'monitoring',
    title: 'satgas_pulang_1 — clocked out',
    proves: 'ADR-050 — pulang lives in history, never as a live pin',
    subject: { handle: 'pulang', role: 'satgas', scope: 'location', adopt: 'satgas_pulang_1' },
    async arrange(ctx) {
      const shift = await onDuty(ctx, 180);
      await ctx.helpers.punch({
        userId: ctx.subject.userId,
        label: 'clock_out',
        at: new Date(ctx.now.getTime() - 10 * 60_000),
        serviceDay: ctx.today,
        shiftDefinitionId: shift,
        locationId: ctx.subject.locationId,
      });
    },
    expect: [offMap('a clocked-out worker leaves the map'), hasDerivedSession],
  },
  {
    id: 'PER-06',
    domain: 'monitoring',
    title: 'satgas_belum_hadir_1 — scheduled, not yet clocked in',
    proves: 'ADR-050 catalog 2 — expected but not due; roster only',
    subject: {
      handle: 'belum_hadir',
      role: 'satgas',
      scope: 'location',
      adopt: 'satgas_belum_hadir_1',
    },
    arrange: (ctx) => roster(ctx).then(() => undefined),
    expect: [rosterStatus('planned'), offMap('not on the map until they punch in')],
  },
  {
    id: 'PER-07',
    domain: 'monitoring',
    title: 'satgas_cuti_1 — approved leave',
    proves: 'ADR-050 catalog 12 — not counted, NOT a no-show',
    subject: { handle: 'cuti', role: 'satgas', scope: 'location', adopt: 'satgas_cuti_1' },
    arrange: (ctx) => roster(ctx, 'leave_annual').then(() => undefined),
    expect: [rosterStatus('leave_annual'), offMap('on leave is never a live pin')],
  },
  {
    id: 'PER-08',
    domain: 'monitoring',
    title: 'satgas_sakit_1 — sick leave',
    proves: 'ADR-050 catalog 13 — excused, distinguishable from an unexcused absence',
    subject: { handle: 'sakit', role: 'satgas', scope: 'location', adopt: 'satgas_sakit_1' },
    arrange: (ctx) => roster(ctx, 'leave_sick').then(() => undefined),
    expect: [rosterStatus('leave_sick'), offMap('sick leave is never a live pin')],
  },
  {
    id: 'PER-09',
    domain: 'monitoring',
    title: 'satgas_izin_1 — permission leave',
    proves: 'ADR-050 catalog 13 — the reason distinguishes it from a no-show',
    subject: { handle: 'izin', role: 'satgas', scope: 'location', adopt: 'satgas_izin_1' },
    arrange: (ctx) => roster(ctx, 'leave_permit').then(() => undefined),
    expect: [rosterStatus('leave_permit'), offMap('permission leave is never a live pin')],
  },
  {
    id: 'PER-10',
    domain: 'monitoring',
    title: 'satgas_libur_1 — day off',
    proves: 'ADR-050 catalog 12 — off duty, nobody expected',
    subject: { handle: 'libur', role: 'satgas', scope: 'location', adopt: 'satgas_libur_1' },
    arrange: (ctx) => roster(ctx, 'off').then(() => undefined),
    expect: [rosterStatus('off'), offMap('a day off is never a live pin')],
  },
  {
    id: 'PER-11',
    domain: 'monitoring',
    title: 'satgas_unscheduled_1 — ad-hoc clock-in',
    proves: 'ADR-054 — pinned to CITY with the ad_hoc flag, never counted',
    subject: {
      handle: 'unscheduled',
      role: 'satgas',
      scope: 'city',
      adopt: 'satgas_unscheduled_1',
    },
    async arrange({ helpers, subject, today, now }) {
      // No roster row at all — that is what makes it ad-hoc.
      const shift = await helpers.currentShiftDefId();
      await helpers.punch({
        userId: subject.userId,
        label: 'clock_in',
        at: new Date(now.getTime() - 30 * 60_000),
        serviceDay: today,
        shiftDefinitionId: shift,
        locationId: subject.locationId,
      });
      await helpers.track({
        userId: subject.userId,
        locationId: subject.locationId,
        districtId: subject.districtId,
        lastLocationAt: new Date(now.getTime() - 60_000),
      });
    },
    expect: [
      {
        what: 'city scope, ad_hoc flag, not scheduled',
        get: () => '/monitoring/snapshot?scope=city',
        check: (body, ctx) => {
          const w = workerById(body, ctx.subject.userId);
          if (!w) return 'an ad-hoc worker must still be visible at city scope';
          if (w.display_scope !== 'city') return `expected city scope, got ${w.display_scope}`;
          if (w.is_scheduled !== false) return 'is_scheduled must be false';
          return w.lifecycle_flags?.includes('ad_hoc') ? null : 'missing the ad_hoc flag';
        },
      },
    ],
  },
  {
    id: 'PER-12',
    domain: 'monitoring',
    title: 'satgas_tidak_bertugas_1 — no schedule, no punch',
    proves: 'ADR-050 catalog 1 — off the map entirely',
    subject: {
      handle: 'tidak_bertugas',
      role: 'satgas',
      scope: 'location',
      adopt: 'satgas_tidak_bertugas_1',
    },
    // Deliberately arranges nothing: absence of state IS the scenario.
    arrange: async () => undefined,
    expect: [offMap('a worker with no schedule and no punch is not on the map')],
  },
  {
    id: 'PER-13',
    domain: 'monitoring',
    title: 'linmas_bertugas_1 — linmas counts like satgas',
    proves: 'ADR-050 axis 3 — satgas AND linmas are the counted roles',
    subject: {
      handle: 'linmas_bertugas',
      role: 'linmas',
      scope: 'location',
      adopt: 'linmas_bertugas_1',
    },
    arrange: (ctx) => onDuty(ctx, 40).then(() => undefined),
    expect: [onMap('linmas renders like any counted field role'), hasDerivedSession],
  },
  {
    id: 'PER-14',
    domain: 'monitoring',
    title: 'korlap_bertugas_1 — monitorable but never counted',
    proves: 'ADR-050 axis 3 — korlap shows on the map and never toward staffing',
    subject: {
      handle: 'korlap_bertugas',
      role: 'korlap',
      scope: 'location',
      adopt: 'korlap_bertugas_1',
    },
    arrange: (ctx) => onDuty(ctx, 40).then(() => undefined),
    expect: [onMap('korlap is monitorable')],
  },
  {
    id: 'PER-15',
    domain: 'monitoring',
    title: 'satgas_terlambat_1 — past start + grace, never clocked in',
    proves: 'ADR-050 catalog 5 — who to chase right now; roster only, never a pin',
    subject: { handle: 'terlambat', role: 'satgas', scope: 'location', adopt: 'satgas_terlambat_1' },
    arrange: (ctx) => roster(ctx).then(() => undefined),
    expect: [rosterStatus('planned'), offMap('a late no-show is not a live pin')],
  },
  {
    id: 'PER-16',
    domain: 'monitoring',
    title: 'satgas_tidak_hadir_1 — window closed, never clocked in',
    proves: 'ADR-050 catalog 7 — the accountable absence',
    subject: {
      handle: 'tidak_hadir',
      role: 'satgas',
      scope: 'location',
      adopt: 'satgas_tidak_hadir_1',
    },
    async arrange(ctx) {
      // Yesterday, so the window plus grace has certainly closed.
      const past = new Date(new Date(`${ctx.today}T00:00:00Z`).getTime() - 86_400_000)
        .toISOString()
        .split('T')[0];
      await ctx.helpers.schedule({
        userId: ctx.subject.userId,
        date: past,
        shiftDefinitionId: await ctx.helpers.shiftDefId('Shift 1'),
        locationId: ctx.subject.locationId,
        districtId: ctx.subject.districtId,
      });
    },
    expect: [offMap('a no-show is never a live pin')],
  },
  {
    id: 'PER-17',
    domain: 'monitoring',
    title: 'satgas_pulang_awal_1 — clocked out before the shift ended',
    proves: 'ADR-050 catalog 8 — pulang with an `early` flag, a supervisor note',
    subject: {
      handle: 'pulang_awal',
      role: 'satgas',
      scope: 'location',
      adopt: 'satgas_pulang_awal_1',
    },
    async arrange(ctx) {
      const shift = await onDuty(ctx, 120);
      await ctx.helpers.punch({
        userId: ctx.subject.userId,
        label: 'clock_out',
        at: new Date(ctx.now.getTime() - 20 * 60_000),
        serviceDay: ctx.today,
        shiftDefinitionId: shift,
        locationId: ctx.subject.locationId,
      });
    },
    expect: [offMap('an early departure leaves the map'), hasDerivedSession],
  },
  {
    id: 'PER-18',
    domain: 'monitoring',
    title: 'satgas_lupa_pulang_1 — forgotten clock-out from a past day',
    proves: 'ADR-055 — never auto-closed, but stops being live',
    guards: 'regression: a dangling session rendered as a live worker for weeks',
    subject: {
      handle: 'lupa_pulang',
      role: 'satgas',
      scope: 'location',
      adopt: 'satgas_lupa_pulang_1',
    },
    async arrange(ctx) {
      const past = new Date(new Date(`${ctx.today}T00:00:00Z`).getTime() - 2 * 86_400_000)
        .toISOString()
        .split('T')[0];
      const shift = await ctx.helpers.shiftDefId('Shift 1');
      await ctx.helpers.schedule({
        userId: ctx.subject.userId,
        date: past,
        shiftDefinitionId: shift,
        locationId: ctx.subject.locationId,
        districtId: ctx.subject.districtId,
      });
      // Clock in and never out — the shape a forgotten clock-out leaves behind.
      await ctx.helpers.punch({
        userId: ctx.subject.userId,
        label: 'clock_in',
        at: ctx.helpers.wibAt(past, '06:00'),
        serviceDay: past,
        shiftDefinitionId: shift,
        locationId: ctx.subject.locationId,
      });
    },
    expect: [offMap('a session whose window closed days ago is not live')],
  },
  {
    id: 'PER-19',
    domain: 'monitoring',
    title: 'satgas_lembur_1 — approved overtime alongside the regular session',
    proves: 'ADR-050 catalog 10 — overtime is explicit, counted, marked distinct',
    subject: { handle: 'lembur', role: 'satgas', scope: 'location', adopt: 'satgas_lembur_1' },
    async arrange(ctx) {
      const shift = await onDuty(ctx, 150);
      // A SECOND session flagged is_overtime — a worker can hold both at once.
      await ctx.helpers.punch({
        userId: ctx.subject.userId,
        label: 'clock_in',
        at: new Date(ctx.now.getTime() - 15 * 60_000),
        serviceDay: ctx.today,
        shiftDefinitionId: shift,
        locationId: ctx.subject.locationId,
        isOvertime: true,
      });
    },
    expect: [onMap('an overtime worker is on duty'), hasDerivedSession],
  },
];
