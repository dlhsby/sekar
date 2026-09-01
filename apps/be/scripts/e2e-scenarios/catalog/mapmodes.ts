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
        // Search matches on FULL NAME, and the seeded name is "E2E <handle>" —
        // querying the username would look for an underscore the name spells as
        // a space, and miss for a reason that has nothing to do with the fix.
        get: ({ subject }) =>
          `/monitoring/search?q=${encodeURIComponent(subject.username.replace(/^e2e_/, ''))}`,
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
  {
    id: 'MON-24',
    domain: 'monitoring',
    title: 'Two workers on one team, both live — something for "Tim saja" to collapse',
    proves: 'ADR-048 team bubbles + the personnel select’s `tim` option',
    guards: 'The seed had ZERO live workers on a team, so team bubbles never rendered at all.',
    subject: { handle: 'team_lead', role: 'satgas', scope: 'location' },
    async arrange({ ds, helpers, subject, today, now }) {
      const shift = await helpers.currentShiftDefId();
      const [team] = (await ds.query(
        `SELECT id FROM team_categories WHERE is_active ORDER BY name LIMIT 1`,
      )) as Array<{ id: string }>;
      if (!team) return;
      // Only this subject here. The PAIRING lives in MON-28's arrange, because
      // the runner provisions each subject's account as it reaches that scenario
      // — at this point `e2e_team_mate` does not exist yet, and looking it up
      // silently produced a team of one.
      await helpers.schedule({
        userId: subject.userId,
        date: today,
        shiftDefinitionId: shift,
        locationId: subject.locationId,
        districtId: subject.districtId,
        teamCategoryId: team.id,
      });
      await helpers.punch({
        userId: subject.userId,
        label: 'clock_in',
        at: new Date(now.getTime() - 40 * 60_000),
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
        what: 'the subject is live and carries a team, so the map can group them',
        get: () => '/monitoring/snapshot?scope=city',
        check: (body, ctx) => {
          const w = snapshotWorkers(body).find((x) => x.user_id === ctx.subject.userId) as
            | { team_id?: string | null; team_name?: string | null }
            | undefined;
          if (!w) return 'team member missing from the snapshot';
          if (!w.team_id)
            return 'no team_id on the live worker — "Tim saja" would hide them and no bubble could form';
          return null;
        },
      },
    ],
  },

  {
    id: 'MON-25',
    domain: 'monitoring',
    title: 'A live worker outside their area, with a fresh fix',
    proves: 'ADR-050 axis 2 — inside/outside is independent of aktif/tidak aktif',
    guards: 'The seed had ZERO workers outside their area, so the "Luar area" figure was always 0.',
    subject: { handle: 'presence_outside', role: 'satgas', scope: 'location' },
    async arrange({ helpers, subject, today, now }) {
      const shift = await helpers.currentShiftDefId();
      await helpers.schedule({
        userId: subject.userId,
        date: today,
        shiftDefinitionId: shift,
        locationId: subject.locationId,
        districtId: subject.districtId,
      });
      await helpers.punch({
        userId: subject.userId,
        label: 'clock_in',
        at: new Date(now.getTime() - 35 * 60_000),
        serviceDay: today,
        shiftDefinitionId: shift,
        locationId: subject.locationId,
        outsideBoundary: true,
      });
      // Fresh ping — aktif — but OUTSIDE. The two axes must not collapse.
      await helpers.track({
        userId: subject.userId,
        locationId: subject.locationId,
        districtId: subject.districtId,
        withinArea: false,
        lastLocationAt: new Date(now.getTime() - 30_000),
      });
    },
    expect: [
      {
        what: 'reads as outside the area while still being live',
        get: () => '/monitoring/snapshot?scope=city',
        check: (body, ctx) => {
          const w = snapshotWorkers(body).find((x) => x.user_id === ctx.subject.userId) as
            | { is_within_area?: boolean }
            | undefined;
          if (!w) return 'missing from the snapshot — an outside worker must still be tracked';
          if (w.is_within_area !== false)
            return 'is_within_area is not false, so the Luar area count stays empty';
          return null;
        },
      },
    ],
  },

  {
    id: 'MON-26',
    domain: 'monitoring',
    title: 'A reassigned worker has history to show',
    proves: 'the worker detail’s Riwayat Pemindahan section (mobile parity)',
    guards: 'The seed had ZERO reassignment rows, so the section never rendered on either platform.',
    subject: { handle: 'reassigned', role: 'satgas', scope: 'location' },
    async arrange({ ds, helpers, subject, today, now }) {
      const shift = await helpers.currentShiftDefId();
      await helpers.schedule({
        userId: subject.userId,
        date: today,
        shiftDefinitionId: shift,
        locationId: subject.locationId,
        districtId: subject.districtId,
      });
      await helpers.punch({
        userId: subject.userId,
        label: 'clock_in',
        at: new Date(now.getTime() - 50 * 60_000),
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
      const [other] = (await ds.query(
        `SELECT id, name FROM locations WHERE is_active AND id <> $1 ORDER BY name LIMIT 1`,
        [subject.locationId],
      )) as Array<{ id: string; name: string }>;
      const [actor] = (await ds.query(
        `SELECT id FROM users WHERE role IN ('kepala_rayon','admin_system','superadmin')
          ORDER BY username LIMIT 1`,
      )) as Array<{ id: string }>;
      const [here] = (await ds.query(`SELECT name FROM locations WHERE id = $1`, [
        subject.locationId,
      ])) as Array<{ name: string }>;
      if (!other || !actor) return;
      await ds.query(
        `INSERT INTO audit_logs (id, entity_type, entity_id, action, actor_id,
                                 old_value, new_value, metadata, created_at)
         VALUES (gen_random_uuid(), 'user', $1, 'reassign', $2, $3, $4, $5, $6)`,
        [
          subject.userId,
          actor.id,
          JSON.stringify({ location_id: other.id, location_name: other.name }),
          JSON.stringify({ location_id: subject.locationId, location_name: here?.name ?? null }),
          JSON.stringify({ reason: 'Penugasan sementara (data uji)', effective_date: today }),
          new Date(now.getTime() - 2 * 60 * 60_000),
        ],
      );
    },
    expect: [
      {
        what: 'the reassignment endpoint returns their history',
        get: ({ subject }) => `/monitoring/users/${subject.userId}/reassignment-history`,
        check: (body) => {
          const d = ((body as { data?: unknown }).data ?? body) as {
            history?: { new_area_name?: string | null }[];
          };
          return (d.history?.length ?? 0) > 0
            ? null
            : 'no reassignment history — the Riwayat Pemindahan section renders empty';
        },
      },
    ],
  },

  {
    id: 'MON-27',
    domain: 'monitoring',
    title: 'A late worker on overtime carries both lifecycle flags',
    proves: 'ADR-050 axis 3 — flags are additive, and web reads them from BOTH sources',
    guards:
      'Web read only lifecycle_flags, so a worker flagged by the is_late boolean showed no pill.',
    subject: { handle: 'flags_late', role: 'satgas', scope: 'location' },
    async arrange({ ds, helpers, subject, today, now }) {
      const shift = await helpers.currentShiftDefId();
      await helpers.schedule({
        userId: subject.userId,
        date: today,
        shiftDefinitionId: shift,
        locationId: subject.locationId,
        districtId: subject.districtId,
      });
      // Clock in AFTER the shift's start + grace, which is what derives `terlambat`.
      const [sd] = (await ds.query(
        `SELECT start_time FROM shift_definitions WHERE id = $1`,
        [shift],
      )) as Array<{ start_time: string }>;
      const startedAt = sd?.start_time
        ? helpers.wibAt(today, sd.start_time.slice(0, 5))
        : new Date(now.getTime() - 3 * 60 * 60_000);
      const late = new Date(Math.min(startedAt.getTime() + 45 * 60_000, now.getTime() - 60_000));
      await helpers.punch({
        userId: subject.userId,
        label: 'clock_in',
        at: late,
        serviceDay: today,
        shiftDefinitionId: shift,
        locationId: subject.locationId,
      });
      await helpers.track({
        userId: subject.userId,
        locationId: subject.locationId,
        districtId: subject.districtId,
        lastLocationAt: new Date(now.getTime() - 40_000),
      });
    },
    expect: [
      {
        what: 'the API reports lateness through a flag or the boolean — either must light the pill',
        get: () => '/monitoring/snapshot?scope=city',
        check: (body, ctx) => {
          const w = snapshotWorkers(body).find((x) => x.user_id === ctx.subject.userId) as
            | { is_late?: boolean; lifecycle_flags?: string[]; lifecycle_state?: string }
            | undefined;
          if (!w) return 'late worker missing from the snapshot';
          const flagged = w.is_late === true || (w.lifecycle_flags ?? []).includes('is_late');
          return flagged
            ? null
            : `neither is_late nor the is_late flag is set (state=${String(w.lifecycle_state)}) — no Terlambat pill anywhere`;
        },
      },
    ],
  },
  {
    id: 'MON-28',
    domain: 'monitoring',
    title: 'The team’s second member — a bubble needs two',
    proves: 'ADR-048 — teamGrouping collapses a team of ≥2; one member renders as a plain pin',
    subject: { handle: 'team_mate', role: 'satgas', scope: 'location' },
    async arrange({ ds, helpers, subject, today, now }) {
      // Runs AFTER MON-24, so both accounts exist by now — which is why the
      // pairing is done here rather than there.
      const [team] = (await ds.query(
        `SELECT id FROM team_categories WHERE is_active ORDER BY name LIMIT 1`,
      )) as Array<{ id: string }>;
      const [lead] = (await ds.query(
        `SELECT id, location_id, district_id FROM users WHERE username = 'e2e_team_lead' LIMIT 1`,
      )) as Array<{ id: string; location_id: string | null; district_id: string | null }>;
      if (!team) return;
      const shift = await helpers.currentShiftDefId();
      // Stand beside the lead so the pair reads as one crew on the map.
      const locationId = lead?.location_id ?? subject.locationId;
      const districtId = lead?.district_id ?? subject.districtId;
      await helpers.schedule({
        userId: subject.userId,
        date: today,
        shiftDefinitionId: shift,
        locationId,
        districtId,
        teamCategoryId: team.id,
      });
      await helpers.punch({
        userId: subject.userId,
        label: 'clock_in',
        at: new Date(now.getTime() - 38 * 60_000),
        serviceDay: today,
        shiftDefinitionId: shift,
        locationId,
      });
      await helpers.track({
        userId: subject.userId,
        locationId,
        districtId,
        lastLocationAt: new Date(now.getTime() - 50_000),
      });
    },
    expect: [
      {
        what: 'shares a team with the lead, so the two collapse into one bubble',
        get: () => '/monitoring/snapshot?scope=city',
        check: (body, ctx) => {
          const all = snapshotWorkers(body) as unknown as {
            user_id: string;
            team_id?: string | null;
          }[];
          const mate = all.find((w) => w.user_id === ctx.subject.userId);
          if (!mate) return 'team mate missing from the snapshot';
          if (!mate.team_id) return 'the second member carries no team_id — no bubble can form';
          const together = all.filter((w) => w.team_id === mate.team_id).length;
          return together >= 2
            ? null
            : `only ${together} live worker on team ${mate.team_id} — a team of one renders as a plain pin`;
        },
      },
    ],
  },
];
