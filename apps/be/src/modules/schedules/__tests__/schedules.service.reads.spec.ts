import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TimezoneUtil } from '../../../common/utils/timezone.util';
import { ScheduleStatus } from '../entities/schedule.entity';
import { UserRole } from '../../users/entities/user.entity';
import { isShiftWindowClosed } from '../schedules.service';
import { ADMIN, setupSchedulesTestbed } from './schedules.testbed';

/**
 * Roster reads — see `schedules.reads.ts`.
 *
 * A day's rows, a worker's rows, the row that is operative right now, and the
 * per-worker lookups the shifts and monitoring modules consume.
 *
 * Split out of the 2,163-line `schedules.service.spec.ts`; all four files share
 * one testbed so the mocks cannot drift between them.
 */
const t = setupSchedulesTestbed();

describe('SchedulesService — roster reads', () => {
  describe('findByDate', () => {
    it('joins the user relation so rows carry user (web table reads user.full_name)', async () => {
      await t.service.findByDate('2026-06-30');
      // `user` is eager on the entity but createQueryBuilder ignores eager
      // relations — the explicit join is what keeps the row's user populated.
      expect(t.rosterRepo.qb.leftJoin).toHaveBeenCalledWith('ds.user', 'u');
      expect(t.rosterRepo.qb.addSelect).toHaveBeenCalledWith(
        expect.arrayContaining(['u.id', 'u.full_name']),
      );
    });

    it('never selects the user avatar (a base64 data URI, once 190 MB per day)', async () => {
      await t.service.findByDate('2026-06-30');
      // `users.profile_picture_url` holds an inline data URI on legacy rows, up
      // to 5 MB each, and a worker appears on many rows per day. Selecting the
      // whole user entity is what made an unscoped day 190 MB.
      const selected = t.rosterRepo.qb.addSelect.mock.calls.flat(2) as string[];
      expect(selected).not.toContain('u.profile_picture_url');
      expect(t.rosterRepo.qb.leftJoinAndSelect).not.toHaveBeenCalledWith('ds.user', 'u');
    });

    it('scopes to a district when one is given', async () => {
      await t.service.findByDate('2026-06-30', 'r1');
      expect(t.rosterRepo.qb.andWhere).toHaveBeenCalledWith('ds.district_id = :districtId', {
        districtId: 'r1',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Projection guards: two key-set queries that decide whether an event's
  // occurrence may be projected. Both used to be unbounded, and one ran INSIDE
  // the per-event loop.
  // ---------------------------------------------------------------------------
  describe('projection guard queries', () => {
    const anEvent = (id: string) => ({
      id,
      scope: 'city',
      is_team: false,
      user_id: 'u1',
      user: { id: 'u1', is_active: true },
      shift_definition_id: 'sd1',
      shift_definition: { id: 'sd1', name: 'S1' },
      start_date: '2026-06-30',
      end_date: '2026-07-05',
      recurrence_type: 'daily',
      is_active: true,
    });

    it('reads tombstones once for the range, not once per event', async () => {
      // This is the N+1 that dominated a month-wide range: ~1k active events on
      // the staging clone meant ~1k sequential round-trips inside the loop.
      t.eventRepo.find.mockResolvedValue([anEvent('e1'), anEvent('e2'), anEvent('e3')]);

      await t.service.findByDateRange('2026-06-30', '2026-07-05');

      // Two guard queries total (tombstone keys + occupied shift keys),
      // regardless of how many events were loaded.
      expect(t.rosterRepo.find).toHaveBeenCalledTimes(2);
    });

    it('narrows both guards by the filters that are components of the key', async () => {
      t.eventRepo.find.mockResolvedValue([anEvent('e1')]);

      await t.service.findByDateRange('2026-06-30', '2026-07-05', {
        userId: 'u9',
        shiftDefinitionId: 'sd9',
        districtId: 'd9',
      });

      for (const call of t.rosterRepo.find.mock.calls) {
        expect(call[0].where).toMatchObject({
          user_id: 'u9',
          shift_definition_id: 'sd9',
          district_id: 'd9',
        });
      }
    });

    it('never narrows a guard by team — a blocking row may belong to another team', async () => {
      // The guards answer "does a row already own this (user, date, shift,
      // place)?". A row in a different team can own it, so filtering the guard
      // by team would drop it and resurrect the phantom projected duplicate
      // `occupiedShiftKeys` exists to prevent.
      t.eventRepo.find.mockResolvedValue([anEvent('e1')]);

      await t.service.findByDateRange('2026-06-30', '2026-07-05', { teamCategoryId: 'tc1' });

      for (const call of t.rosterRepo.find.mock.calls) {
        expect(call[0].where).not.toHaveProperty('team_category_id');
      }
    });

    // "Seluruh Surabaya" is bound to no geography, so its leaf fetch has no id
    // to scope by and instead asks for the rows that carry none. The
    // materialized query honoured that with three IS NULL predicates; the
    // PROJECTION did not, so every geography-bound event still expanded into
    // the city container's response — 99 foreign rows out of 100 on the clone,
    // reinstating the overfetch `cityScopeOnly` exists to prevent.
    it('cityScopeOnly drops geography-bound events from the projection too', async () => {
      const cityEvent = anEvent('city');
      const atALokasi = {
        ...anEvent('static'),
        scope: 'static',
        location_id: 'loc1',
        location: { id: 'loc1', region_id: 'kw1', district_id: 'ry1' },
      };
      t.eventRepo.find.mockResolvedValue([cityEvent, atALokasi]);

      const rows = await t.service.findByDateRange('2026-06-30', '2026-07-05', {
        cityScopeOnly: true,
      });

      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((r) => !r.location_id && !r.region_id && !r.district_id)).toBe(true);
      expect(rows.every((r) => r.schedule_event_id === 'city')).toBe(true);
    });
  });

  describe('findByDateRange', () => {
    it('queries schedules between from and to dates inclusive', async () => {
      await t.service.findByDateRange('2026-06-30', '2026-07-05');
      expect(t.rosterRepo.qb.where).toHaveBeenCalledWith('ds.schedule_date >= :from', {
        from: '2026-06-30',
      });
      expect(t.rosterRepo.qb.andWhere).toHaveBeenCalledWith('ds.schedule_date <= :to', {
        to: '2026-07-05',
      });
    });

    it('joins user, shift_definition, location, region, and team_category relations (Phase 4)', async () => {
      await t.service.findByDateRange('2026-06-30', '2026-07-05');
      const joinCalls = t.rosterRepo.qb.leftJoin.mock.calls;
      expect(joinCalls.some((c) => c[0] === 'ds.user')).toBe(true);
      expect(joinCalls.some((c) => c[0] === 'ds.shift_definition')).toBe(true);
      expect(joinCalls.some((c) => c[0] === 'ds.location')).toBe(true);
      expect(joinCalls.some((c) => c[0] === 'ds.region')).toBe(true);
      expect(joinCalls.some((c) => c[0] === 'ds.team_category')).toBe(true);
    });

    it('selects location/region by NAME only — never the boundary polygon', async () => {
      // Regression guard. `leftJoinAndSelect` stamped ~2 KB of GeoJSON onto every
      // row: a 31-day all-district range measured 293 MB / 29 s on the staging
      // clone, and staging runs the API at --max-old-space-size=384, so that
      // response is an OOM rather than a slow page. Re-adding a bare
      // leftJoinAndSelect for these relations must fail here.
      await t.service.findByDateRange('2026-06-30', '2026-07-05');
      const selected = t.rosterRepo.qb.addSelect.mock.calls.flatMap((c) => c[0] as string[]);
      expect(selected).toEqual(expect.arrayContaining(['location.id', 'location.name']));
      expect(selected).toEqual(expect.arrayContaining(['r.id', 'r.name']));
      expect(selected.some((f) => f.includes('boundary_polygon'))).toBe(false);
      expect(selected.some((f) => f.includes('coverage_area'))).toBe(false);
      // The lazy no-show flip (ADR-056) needs the grace on both frontends.
      expect(selected).toEqual(expect.arrayContaining(['sd.cutoff_grace_min']));
      const wholeRelationJoins = t.rosterRepo.qb.leftJoinAndSelect.mock.calls.map((c) => c[0]);
      expect(wholeRelationJoins).not.toContain('ds.location');
      expect(wholeRelationJoins).not.toContain('ds.region');
    });

    it('scopes to a district when one is given', async () => {
      await t.service.findByDateRange('2026-06-30', '2026-07-05', 'r1');
      expect(t.rosterRepo.qb.andWhere).toHaveBeenCalledWith('ds.district_id = :districtId', {
        districtId: 'r1',
      });
    });
  });

  describe('findAllByUserAndDate', () => {
    it('returns all rows for a user on a date, sorted by shift start_time', async () => {
      const shift1 = { id: 's1', start_time: '06:00:00', end_time: '15:00:00' };
      const shift2 = { id: 's2', start_time: '15:00:00', end_time: '23:00:00' };
      t.rosterRepo.find.mockResolvedValue([
        { id: 'd1', user_id: 'W', shift_definition: shift2 }, // Out of order in DB
        { id: 'd2', user_id: 'W', shift_definition: shift1 },
      ]);

      const result = await t.service.findAllByUserAndDate('W', '2026-07-04');

      expect(result).toHaveLength(2);
      // Sorted by start_time
      expect(result[0].shift_definition?.start_time).toBe('06:00:00');
      expect(result[1].shift_definition?.start_time).toBe('15:00:00');
    });

    it('returns single row as-is', async () => {
      const row = { id: 'd1', user_id: 'W', shift_definition: null };
      t.rosterRepo.find.mockResolvedValue([row]);

      const result = await t.service.findAllByUserAndDate('W', '2026-07-04');

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(row);
    });

    it('returns empty array when no rows exist', async () => {
      t.rosterRepo.find.mockResolvedValue([]);

      const result = await t.service.findAllByUserAndDate('W', '2026-07-04');

      expect(result).toEqual([]);
    });
  });

  describe('findByUserAndDate', () => {
    it('returns null when no rows exist', async () => {
      t.rosterRepo.find.mockResolvedValue([]);

      const result = await t.service.findByUserAndDate('W', '2026-07-04');

      expect(result).toBeNull();
    });

    it('returns single row as-is', async () => {
      const row = { id: 'd1', user_id: 'W', shift_definition: null };
      t.rosterRepo.find.mockResolvedValue([row]);

      const result = await t.service.findByUserAndDate('W', '2026-07-04');

      expect(result).toBe(row);
    });

    /** Freeze "now" at a WIB wall-clock time (jakartaNow returns a Date whose
     * UTC fields read as WIB). */
    const freezeWibClock = (hours: number, minutes = 0) => {
      const frozen = new Date(Date.UTC(2026, 6, 4, hours, minutes, 0));
      return jest.spyOn(TimezoneUtil, 'jakartaNow').mockReturnValue(frozen);
    };

    it('picks the shift whose window covers now (WIB)', async () => {
      const shift1 = { id: 's1', start_time: '06:00:00', end_time: '15:00:00' };
      const shift2 = { id: 's2', start_time: '15:00:00', end_time: '23:00:00' };
      t.rosterRepo.find.mockResolvedValue([
        { id: 'd1', shift_definition: shift1 },
        { id: 'd2', shift_definition: shift2 },
      ]);
      const spy = freezeWibClock(16, 30); // 16:30 WIB → inside shift 2

      const result = await t.service.findByUserAndDate('W', '2026-07-04');

      expect(result?.id).toBe('d2');
      spy.mockRestore();
    });

    it('covers a crosses-midnight shift after its evening start', async () => {
      const shift1 = { id: 's1', start_time: '06:00:00', end_time: '15:00:00' };
      const shift3 = {
        id: 's3',
        start_time: '21:00:00',
        end_time: '05:00:00',
        crosses_midnight: true,
      };
      t.rosterRepo.find.mockResolvedValue([
        { id: 'd1', shift_definition: shift1 },
        { id: 'd3', shift_definition: shift3 },
      ]);
      const spy = freezeWibClock(22, 0); // 22:00 WIB → inside shift 3 tonight

      const result = await t.service.findByUserAndDate('W', '2026-07-04');

      expect(result?.id).toBe('d3');
      spy.mockRestore();
    });

    it("at 03:00, TODAY's crosses-midnight row is not yet covering — the upcoming day shift wins", async () => {
      // The 00:00–05:00 tail belongs to YESTERDAY's shift-3 row (served when
      // querying yesterday's date); today's shift-3 row starts tonight.
      const shift1 = { id: 's1', start_time: '06:00:00', end_time: '15:00:00' };
      const shift3 = {
        id: 's3',
        start_time: '21:00:00',
        end_time: '05:00:00',
        crosses_midnight: true,
      };
      t.rosterRepo.find.mockResolvedValue([
        { id: 'd1', shift_definition: shift1 },
        { id: 'd3', shift_definition: shift3 },
      ]);
      const spy = freezeWibClock(3, 0);

      const result = await t.service.findByUserAndDate('W', '2026-07-04');

      expect(result?.id).toBe('d1');
      spy.mockRestore();
    });

    it('picks the next upcoming shift when none covers now', async () => {
      const shift1 = { id: 's1', start_time: '06:00:00', end_time: '15:00:00' };
      const shift2 = { id: 's2', start_time: '16:00:00', end_time: '23:00:00' };
      t.rosterRepo.find.mockResolvedValue([
        { id: 'd1', shift_definition: shift1 },
        { id: 'd2', shift_definition: shift2 },
      ]);
      const spy = freezeWibClock(15, 30); // 15:30 WIB → between the shifts

      const result = await t.service.findByUserAndDate('W', '2026-07-04');

      expect(result?.id).toBe('d2');
      spy.mockRestore();
    });

    it('falls back to the last shift of the day when all have passed', async () => {
      const shift1 = { id: 's1', start_time: '06:00:00', end_time: '15:00:00' };
      const shift2 = { id: 's2', start_time: '15:00:00', end_time: '20:00:00' };
      t.rosterRepo.find.mockResolvedValue([
        { id: 'd1', shift_definition: shift1 },
        { id: 'd2', shift_definition: shift2 },
      ]);
      const spy = freezeWibClock(23, 0); // 23:00 WIB → after both

      const result = await t.service.findByUserAndDate('W', '2026-07-04');

      expect(result?.id).toBe('d2');
      spy.mockRestore();
    });
  });

  describe('findCurrentForUser — dangling open shift fallback', () => {
    const SHIFT3 = {
      id: 'sd3',
      start_time: '21:00:00',
      end_time: '05:00:00',
      crosses_midnight: true,
    };

    /** Freeze both "now" (nowMin) and "today" (WIB date string) for the resolver. */
    const freeze = (nowUtc: Date, todayStr: string) => {
      const spyNow = jest.spyOn(TimezoneUtil, 'jakartaNow').mockReturnValue(nowUtc);
      const spyDate = jest
        .spyOn(TimezoneUtil, 'jakartaDateString')
        // With an explicit date (the shift's clock-in), compute the real WIB day;
        // with no arg, return the frozen "today".
        .mockImplementation((d?: Date) =>
          d ? new Date(d.getTime() + 7 * 60 * 60 * 1000).toISOString().split('T')[0] : todayStr,
        );
      return () => {
        spyNow.mockRestore();
        spyDate.mockRestore();
      };
    };

    it("surfaces yesterday's still-open shift after its window ends (05:42, Shift 3 not clocked out)", async () => {
      // The reported bug: a Shift 3 (21:00–05:00) clocked in Jul 24 21:39 and never
      // clocked out. At 05:42 Jul 25 the carried-tail test (now < end_time) fails,
      // and today's roster is empty — so the worker was shown "belum ada jadwal".
      const july24Row = {
        id: 'r24',
        user_id: 'W',
        schedule_date: '2026-07-24',
        shift_definition_id: 'sd3',
        shift_definition: SHIFT3,
        location: { id: 'loc1', name: 'Taman Barat' },
      };
      t.rosterRepo.find.mockImplementation((opts: { where: { schedule_date: string } }) =>
        Promise.resolve(opts.where.schedule_date === '2026-07-24' ? [july24Row] : []),
      );
      // Open shift: clocked in Jul 24 21:39 WIB (= 14:39 UTC), no clock_out_time.
      t.shiftRepo.findOne.mockResolvedValue({
        id: 'shift-open',
        user_id: 'W',
        shift_definition_id: 'sd3',
        clock_in_time: new Date(Date.UTC(2026, 6, 24, 14, 39, 0)),
        clock_out_time: null,
      });
      const restore = freeze(new Date(Date.UTC(2026, 6, 25, 5, 42, 0)), '2026-07-25');

      const result = await t.service.findCurrentForUser('W');

      expect(result?.id).toBe('r24');
      expect(result?.shift_definition_id).toBe('sd3');
      restore();
    });

    it('returns null when nothing is scheduled and there is no open shift', async () => {
      t.rosterRepo.find.mockResolvedValue([]);
      t.shiftRepo.findOne.mockResolvedValue(null); // no dangling shift
      const restore = freeze(new Date(Date.UTC(2026, 6, 25, 5, 42, 0)), '2026-07-25');

      const result = await t.service.findCurrentForUser('W');

      expect(result).toBeNull();
      restore();
    });

    it('does not shadow a genuine current-day shift with a dangling one', async () => {
      // A current-day Shift 1 is operative at 07:00; the open Shift 3 fallback must
      // NOT run (resolved wins), so the worker sees today's shift, not yesterday's.
      const shift1 = { id: 'sd1', start_time: '06:00:00', end_time: '15:00:00' };
      const todayRow = { id: 'r25', schedule_date: '2026-07-25', shift_definition: shift1 };
      t.rosterRepo.find.mockImplementation((opts: { where: { schedule_date: string } }) =>
        Promise.resolve(opts.where.schedule_date === '2026-07-25' ? [todayRow] : []),
      );
      const restore = freeze(new Date(Date.UTC(2026, 6, 25, 7, 0, 0)), '2026-07-25');

      const result = await t.service.findCurrentForUser('W');

      expect(result?.id).toBe('r25');
      expect(t.shiftRepo.findOne).not.toHaveBeenCalled();
      restore();
    });
  });

  describe('getActiveAreasForDay', () => {
    it("returns the day's areas", async () => {
      t.rosterRepo.find.mockResolvedValue([
        {
          id: 'd1',
          // ONE place per row (ADR-053) — several lokasi means several rows.
          location_id: 'area1',
          location: { id: 'area1' },
        },
      ]);
      const areas = await t.service.getActiveAreasForDay('A', '2026-06-30');
      expect(areas.map((a) => a.id)).toEqual(['area1']);
    });

    it('returns empty when there is no roster row', async () => {
      t.rosterRepo.find.mockResolvedValue([]);
      expect(await t.service.getActiveAreasForDay('A', '2026-06-30')).toEqual([]);
    });
  });

  describe('getAttributionCandidates (ADR-055)', () => {
    const sd = (id: string, start: string, end: string, crossing = false) => ({
      id,
      start_time: start,
      end_time: end,
      crosses_midnight: crossing,
      early_window_min: 60,
      cutoff_grace_min: 60,
    });

    it('maps PLANNED/PRESENT yesterday+today rows, excludes leave/off, dedups per (day,shift)', async () => {
      t.rosterRepo.find
        // yesterday: a crossing Shift 3 (PLANNED) + an OFF row (excluded)
        .mockResolvedValueOnce([
          {
            schedule_date: '2026-07-24',
            status: ScheduleStatus.PLANNED,
            shift_definition: sd('sd-3', '21:00:00', '05:00:00', true),
          },
          {
            schedule_date: '2026-07-24',
            status: ScheduleStatus.OFF,
            shift_definition: sd('sd-1', '06:00:00', '15:00:00'),
          },
        ])
        // today: Shift 1 PRESENT + duplicate Shift 1 PLANNED (dedup) + a LEAVE row (excluded)
        .mockResolvedValueOnce([
          {
            schedule_date: '2026-07-25',
            status: ScheduleStatus.PRESENT,
            shift_definition: sd('sd-1', '06:00:00', '15:00:00'),
          },
          {
            schedule_date: '2026-07-25',
            status: ScheduleStatus.PLANNED,
            shift_definition: sd('sd-1', '06:00:00', '15:00:00'),
          },
          {
            schedule_date: '2026-07-25',
            status: ScheduleStatus.LEAVE_SICK,
            shift_definition: sd('sd-2', '15:00:00', '23:00:00'),
          },
        ]);

      const result = await t.service.getAttributionCandidates('user-1');

      expect(result.map((c) => c.shift_definition_id)).toEqual(['sd-3', 'sd-1']);
      expect(result.find((c) => c.shift_definition_id === 'sd-3')).toMatchObject({
        service_day: '2026-07-24',
        crosses_midnight: true,
        early_window_min: 60,
        cutoff_grace_min: 60,
      });
      expect(result.filter((c) => c.shift_definition_id === 'sd-1')).toHaveLength(1); // deduped
    });
  });

  describe('getTeamMembership (Phase 5.7)', () => {
    it('returns an empty Map when userIds is empty', async () => {
      const result = await t.service.getTeamMembership([], '2026-07-01');
      expect(result).toEqual(new Map());
    });

    it('queries schedules with team_category_id IS NOT NULL for the given date and user IDs', async () => {
      const result = await t.service.getTeamMembership(['u1', 'u2'], '2026-07-01');

      // Verify the query builder was called correctly
      expect(t.rosterRepo.qb.leftJoinAndSelect).toHaveBeenCalledWith('ds.team_category', 'tc');
      expect(t.rosterRepo.qb.where).toHaveBeenCalledWith('ds.user_id IN (:...userIds)', {
        userIds: ['u1', 'u2'],
      });
      expect(t.rosterRepo.qb.andWhere).toHaveBeenCalledWith('ds.schedule_date = :date', {
        date: '2026-07-01',
      });
      expect(t.rosterRepo.qb.andWhere).toHaveBeenCalledWith('ds.deleted_at IS NULL');
      expect(t.rosterRepo.qb.andWhere).toHaveBeenCalledWith('ds.team_category_id IS NOT NULL');
    });

    it('returns team_id = schedule_event_id when schedule_event_id is present (ADR-048 grouping key)', async () => {
      const scheduleRow = {
        user_id: 'u1',
        schedule_event_id: 'event-123',
        team_category_id: 'cat-456',
        team_category: { name: 'Penyiraman', marker_color: '#22C55E' },
      };
      t.rosterRepo.qb.getMany.mockResolvedValue([scheduleRow]);

      const result = await t.service.getTeamMembership(['u1'], '2026-07-01');

      expect(result.get('u1')).toEqual({
        team_id: 'event-123',
        team_name: 'Penyiraman',
        team_color: '#22C55E',
        team_opacity: null,
        team_icon: null,
      });
    });

    it('returns team_id = team_category_id when schedule_event_id is null (fallback)', async () => {
      const scheduleRow = {
        user_id: 'u1',
        schedule_event_id: null,
        team_category_id: 'cat-456',
        team_category: { name: 'Perawatan', marker_color: '#FF6B6B' },
      };
      t.rosterRepo.qb.getMany.mockResolvedValue([scheduleRow]);

      const result = await t.service.getTeamMembership(['u1'], '2026-07-01');

      expect(result.get('u1')).toEqual({
        team_id: 'cat-456',
        team_name: 'Perawatan',
        team_color: '#FF6B6B',
        team_opacity: null,
        team_icon: null,
      });
    });

    it('maps team_color to null when marker_color is null', async () => {
      const scheduleRow = {
        user_id: 'u1',
        schedule_event_id: 'event-123',
        team_category_id: 'cat-456',
        team_category: { name: 'Penyapuan', marker_color: null },
      };
      t.rosterRepo.qb.getMany.mockResolvedValue([scheduleRow]);

      const result = await t.service.getTeamMembership(['u1'], '2026-07-01');

      expect(result.get('u1')).toEqual({
        team_id: 'event-123',
        team_name: 'Penyapuan',
        team_color: null,
        team_opacity: null,
        team_icon: null,
      });
    });

    it('handles multiple users and returns first match per user (created_at order)', async () => {
      const scheduleRows = [
        {
          user_id: 'u1',
          schedule_event_id: 'event-1',
          team_category_id: 'cat-1',
          team_category: { name: 'Team A', marker_color: '#22C55E' },
        },
        {
          user_id: 'u1',
          schedule_event_id: 'event-2',
          team_category_id: 'cat-2',
          team_category: { name: 'Team B', marker_color: '#FF6B6B' },
        },
        {
          user_id: 'u2',
          schedule_event_id: 'event-3',
          team_category_id: 'cat-3',
          team_category: { name: 'Team C', marker_color: '#69D2E7' },
        },
      ];
      t.rosterRepo.qb.getMany.mockResolvedValue(scheduleRows);

      const result = await t.service.getTeamMembership(['u1', 'u2'], '2026-07-01');

      // u1: first win (event-1, Team A)
      expect(result.get('u1')).toEqual({
        team_id: 'event-1',
        team_name: 'Team A',
        team_color: '#22C55E',
        team_opacity: null,
        team_icon: null,
      });
      // u2: only one (event-3, Team C)
      expect(result.get('u2')).toEqual({
        team_id: 'event-3',
        team_name: 'Team C',
        team_color: '#69D2E7',
        team_opacity: null,
        team_icon: null,
      });
      expect(result.size).toBe(2);
    });

    it('skips rows where team_category is missing', async () => {
      const scheduleRows = [
        {
          user_id: 'u1',
          schedule_event_id: 'event-1',
          team_category_id: 'cat-1',
          team_category: null, // Missing relation
        },
      ];
      t.rosterRepo.qb.getMany.mockResolvedValue(scheduleRows);

      const result = await t.service.getTeamMembership(['u1'], '2026-07-01');

      expect(result.size).toBe(0);
    });

    it('skips rows where both schedule_event_id and team_category_id would be null', async () => {
      const scheduleRows = [
        {
          user_id: 'u1',
          schedule_event_id: null,
          team_category_id: null,
          team_category: { name: 'Team A', marker_color: '#22C55E' },
        },
      ];
      t.rosterRepo.qb.getMany.mockResolvedValue(scheduleRows);

      const result = await t.service.getTeamMembership(['u1'], '2026-07-01');

      expect(result.size).toBe(0);
    });
  });
});
