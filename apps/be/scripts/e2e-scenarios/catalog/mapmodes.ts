/**
 * Map-mode scenarios (ADR-060) — the data that makes DRILL and ZOOM visibly
 * different, plus the cases the monitoring revamp added.
 *
 * The point of the file is one worker: `mode_mismatch`. Their schedule is scoped
 * to the RAYON while they physically stand inside a LOKASI. Drill mode shows
 * them at the rayon and nowhere else; zoom mode shows them inside the lokasi
 * too. Any worker whose schedule scope happens to match their position proves
 * nothing about the modes, because both predicates agree on them — which is why
 * a mismatch has to be seeded deliberately.
 *
 * Every scenario here is also a hand-testing fixture: the handles below are the
 * names to look for on screen, and `specs/testing/manual-uat.md` walks them.
 */

import type { Scenario } from '../types';
import { workerById, snapshotWorkers } from './assertions';

export const MAPMODES: Scenario[] = [
  {
    id: 'MON-20',
    domain: 'monitoring',
    title: 'A rayon-scheduled worker standing in a lokasi: drill hides them there, zoom shows them',
    proves:
      'ADR-060 — drill asks "is their SCHEDULE scoped here", zoom asks "are they STANDING here"',
    guards:
      'The two modes must disagree for this worker. If they agree, one of the predicates is wrong.',
    subject: { handle: 'mode_mismatch', role: 'satgas', scope: 'district' },
    async arrange({ helpers, subject, today, now }) {
      const shift = await helpers.currentShiftDefId();
      // Scheduled at the RAYON — no location_id, so display_scope resolves to district.
      await helpers.schedule({
        userId: subject.userId,
        date: today,
        shiftDefinitionId: shift,
        districtId: subject.districtId,
      });
      // …but clocked in AT a lokasi, so their tracking row carries location_id.
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
        what: 'display_scope is district — so DRILL mode places them at the rayon only',
        get: ({ subject }) => `/monitoring/snapshot?scope=district&id=${subject.districtId}`,
        check: (body, ctx) => {
          const w = workerById(body, ctx.subject.userId);
          if (!w) return 'missing from their own rayon payload';
          if (w.display_scope !== 'district')
            return `display_scope is "${w.display_scope}", expected "district" — drill mode would place them elsewhere`;
          return null;
        },
      },
      {
        what: 'the snapshot still carries their real lokasi — what ZOOM mode filters on',
        get: () => '/monitoring/snapshot?scope=city',
        check: (body, ctx) => {
          const w = snapshotWorkers(body).find((x) => x.user_id === ctx.subject.userId) as
            | (Record<string, unknown> & { location_id?: string | null })
            | undefined;
          if (!w) return 'missing from the city snapshot';
          if (!w.location_id)
            return 'no location_id on the worker — zoom mode has nothing to match, so the modes cannot differ';
          if (w.location_id !== ctx.subject.locationId)
            return `location_id is ${String(w.location_id)}, expected the lokasi they clocked in at`;
          return null;
        },
      },
    ],
  },

  {
    id: 'MON-21',
    domain: 'monitoring',
    title: 'An ad-hoc clock-in keeps its real geography, so zoom can place it in a rayon',
    proves:
      'ADR-060 — an unscheduled worker is flat at city for drill, but zoom shows them where they actually are',
    subject: { handle: 'mode_adhoc', role: 'satgas', scope: 'location' },
    async arrange({ helpers, subject, today, now }) {
      // Deliberately NO schedule — that is what makes the clock-in ad-hoc.
      await helpers.punch({
        userId: subject.userId,
        label: 'clock_in',
        at: new Date(now.getTime() - 25 * 60_000),
        serviceDay: today,
        shiftDefinitionId: await helpers.currentShiftDefId(),
        locationId: subject.locationId,
      });
      await helpers.track({
        userId: subject.userId,
        locationId: subject.locationId,
        districtId: subject.districtId,
        lastLocationAt: new Date(now.getTime() - 45_000),
      });
    },
    expect: [
      {
        what: 'flat at city with the ad_hoc flag (drill), but still carrying district_id (zoom)',
        get: () => '/monitoring/snapshot?scope=city',
        check: (body, ctx) => {
          const w = snapshotWorkers(body).find((x) => x.user_id === ctx.subject.userId) as
            | { district_id?: string | null; display_scope?: string; lifecycle_flags?: string[] }
            | undefined;
          if (!w) return 'ad-hoc worker missing from the city snapshot';
          if (w.display_scope !== 'city')
            return `display_scope is "${w.display_scope}", expected "city" for an ad-hoc clock-in`;
          if (!(w.lifecycle_flags ?? []).includes('ad_hoc'))
            return 'missing the ad_hoc flag — the map cannot style them Luar Jadwal';
          if (!w.district_id)
            return 'no district_id — zoom mode could not place them inside their rayon';
          return null;
        },
      },
    ],
  },

  {
    id: 'MON-22',
    domain: 'monitoring',
    title: 'Every geo tier the map draws has a boundary and a centre',
    proves:
      'ADR-060 zoom mode + the mobile kawasan layer — a tier with no geometry cannot be drawn',
    guards:
      "Mobile discarded the payload's regions[] entirely; this fails if kawasan geometry stops being served.",
    subject: { handle: 'mode_geo', role: 'satgas', scope: 'location' },
    async arrange() {
      // Pure read check — the geography is seeded, not arranged here.
    },
    expect: [
      {
        what: 'boundaries return rayon + kawasan + lokasi geometry in ONE call (zoom mode’s source)',
        get: () => '/monitoring/boundaries?level=area',
        check: (body) => {
          const d = (body as { data?: unknown }).data ?? body;
          const districts = (d as { districts?: unknown[] }).districts ?? [];
          if (districts.length === 0) return 'no districts returned';
          let regions = 0;
          let regionsWithGeometry = 0;
          let areas = 0;
          let areasWithCentre = 0;
          for (const raw of districts) {
            const dist = raw as {
              regions?: { boundary_polygon?: unknown }[];
              areas?: { center_lat?: number | null }[];
            };
            for (const r of dist.regions ?? []) {
              regions += 1;
              if (r.boundary_polygon) regionsWithGeometry += 1;
            }
            for (const a of dist.areas ?? []) {
              areas += 1;
              if (a.center_lat != null) areasWithCentre += 1;
            }
          }
          if (regions === 0)
            return 'no kawasan in the payload — mobile’s kawasan layer would have nothing to draw';
          if (regionsWithGeometry === 0)
            return `all ${regions} kawasan came back without a boundary_polygon`;
          if (areas === 0) return 'no lokasi in the payload';
          if (areasWithCentre === 0)
            return 'no lokasi carries a centre — search results could not be focused';
          return null;
        },
      },
    ],
  },

  {
    id: 'MON-23',
    domain: 'monitoring',
    title: 'A rostered worker who never clocked in is findable by name',
    proves:
      'the widened /monitoring/search — the live query is rooted in tracking rows and cannot surface them',
    guards:
      'Typing a known satgas’s name returned nothing whenever they had not punched in.',
    subject: { handle: 'search_absent', role: 'satgas', scope: 'location' },
    async arrange({ helpers, subject, today }) {
      // Rostered, deliberately no punch — the exact worker search used to miss.
      await helpers.schedule({
        userId: subject.userId,
        date: today,
        shiftDefinitionId: await helpers.currentShiftDefId(),
        locationId: subject.locationId,
        districtId: subject.districtId,
      });
    },
    expect: [
      {
        what: 'search by their name returns them among the roster lists',
        get: ({ subject }) => `/monitoring/search?q=${encodeURIComponent(subject.username)}`,
        check: (body, ctx) => {
          const d = ((body as { data?: unknown }).data ?? body) as {
            absent_users?: { user_id: string }[];
            on_leave_users?: { user_id: string }[];
          };
          const hit = [...(d.absent_users ?? []), ...(d.on_leave_users ?? [])].some(
            (u) => u.user_id === ctx.subject.userId,
          );
          // The username is the search term; the seeded full_name contains it for
          // the e2e personas, and adopted personas match on their own name.
          return hit
            ? null
            : 'a rostered, not-clocked-in worker is still unfindable by name';
        },
      },
    ],
    // Name matching is on `full_name`; the clone's adopted personas have names
    // unrelated to their handle, so only assert this where we own the account.
    skipIf: () =>
      process.env.E2E_MODE === 'clone'
        ? 'clone personas have real names unrelated to the handle'
        : null,
  },
];
