import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TimezoneUtil } from '../../../common/utils/timezone.util';
import { ScheduleStatus } from '../entities/schedule.entity';
import { UserRole } from '../../users/entities/user.entity';
import { isShiftWindowClosed } from '../schedules.service';
import { ADMIN, setupSchedulesTestbed } from './schedules.testbed';

/**
 * Availability — see `schedules.availability.ts`.
 *
 * Who is NOT on the roster (the gap panel) and who stopped being expected on it
 * (the ADR-056 absence sweep).
 *
 * Split out of the 2,163-line `schedules.service.spec.ts`; all four files share
 * one testbed so the mocks cannot drift between them.
 */
const t = setupSchedulesTestbed();

describe('SchedulesService — availability', () => {
  /**
   * ADR-054. Two rules carry the whole feature, and both are easy to get wrong:
   * a projected occurrence must count as scheduled, and an excused row must not
   * land in the list of people to place.
   */
  describe('findUnscheduled', () => {
    const worker = (id: string, role: UserRole, name = id) => ({
      id,
      full_name: name,
      username: id,
      role,
      district_id: 'ry1',
      is_active: true,
    });

    /** Stub the workforce query (getRawAndEntities) and the day's occurrences. */
    const setup = (workforce: unknown[], occurrences: unknown[]) => {
      const uqb: Record<string, jest.Mock> = {};
      for (const m of ['leftJoin', 'addSelect', 'where', 'andWhere', 'orderBy']) {
        uqb[m] = jest.fn(() => uqb);
      }
      uqb.getRawAndEntities = jest.fn().mockResolvedValue({
        entities: workforce,
        raw: workforce.map(() => ({ u_district_id: 'ry1', district_name: 'Rayon Pusat' })),
      });
      (t.userRepo as unknown as { createQueryBuilder: jest.Mock }).createQueryBuilder = jest.fn(
        () => uqb,
      );
      jest.spyOn(t.service, 'findByDateRange').mockResolvedValue(occurrences as never);
      return uqb;
    };

    it('counts a PROJECTED occurrence as scheduled', async () => {
      // The trap: projections are not rows, so a NOT EXISTS against `schedules`
      // would report everyone on a daily rule as unscheduled for every future
      // date — the list would be noise exactly where planning happens.
      setup(
        [worker('u1', UserRole.SATGAS)],
        [{ user_id: 'u1', status: ScheduleStatus.PLANNED, is_projected: true }],
      );

      const res = await t.service.findUnscheduled('2026-08-30');

      expect(res.unscheduled).toHaveLength(0);
      expect(res.totals.scheduled).toBe(1);
    });

    it('separates an EXCUSED worker from a genuinely free one', async () => {
      // Someone on cuti has no assignment and cannot take one; listing them
      // beside free workers invites scheduling over approved leave.
      setup(
        [worker('u1', UserRole.SATGAS), worker('u2', UserRole.LINMAS)],
        [{ user_id: 'u2', status: ScheduleStatus.LEAVE_ANNUAL }],
      );

      const res = await t.service.findUnscheduled('2026-07-23');

      expect(res.unscheduled.map((w) => w.id)).toEqual(['u1']);
      expect(res.unavailable.map((w) => w.id)).toEqual(['u2']);
      expect(res.unavailable[0].status).toBe(ScheduleStatus.LEAVE_ANNUAL);
    });

    it('treats a live assignment as outranking an excused row for the same worker', async () => {
      setup(
        [worker('u1', UserRole.SATGAS)],
        [
          { user_id: 'u1', status: ScheduleStatus.OFF },
          { user_id: 'u1', status: ScheduleStatus.PLANNED },
        ],
      );

      const res = await t.service.findUnscheduled('2026-07-23');

      expect(res.unscheduled).toHaveLength(0);
      expect(res.unavailable).toHaveLength(0);
      expect(res.totals.scheduled).toBe(1);
    });

    it('treats a row on ANOTHER shift as not filling the target shift', async () => {
      // ADR-053: holding rows for other shifts is normal and says nothing about
      // availability for THIS one.
      setup(
        [worker('u1', UserRole.SATGAS)],
        [{ user_id: 'u1', status: ScheduleStatus.PLANNED, shift_definition_id: 'shift-2' }],
      );

      const res = await t.service.findUnscheduled('2026-07-23', { shiftDefinitionId: 'shift-1' });

      expect(res.unscheduled.map((w) => w.id)).toEqual(['u1']);
    });

    it('treats a row at ANOTHER lokasi as not filling the target lokasi', async () => {
      // The filters describe the SLOT being filled. Being busy at Taman B does
      // not disqualify someone from also covering Taman A (ADR-053).
      setup(
        [worker('u1', UserRole.SATGAS)],
        [{ user_id: 'u1', status: ScheduleStatus.PLANNED, location_id: 'loc-b' }],
      );

      const res = await t.service.findUnscheduled('2026-07-23', { locationId: 'loc-a' });

      expect(res.unscheduled.map((w) => w.id)).toEqual(['u1']);
    });

    it('excludes a worker whose row MATCHES every target criterion', async () => {
      setup(
        [worker('u1', UserRole.SATGAS)],
        [
          {
            user_id: 'u1',
            status: ScheduleStatus.PLANNED,
            shift_definition_id: 'shift-1',
            district_id: 'ry1',
            region_id: 'kw1',
            location_id: 'loc-a',
          },
        ],
      );

      const res = await t.service.findUnscheduled('2026-07-23', {
        shiftDefinitionId: 'shift-1',
        districtId: 'ry1',
        regionId: 'kw1',
        locationId: 'loc-a',
      });

      expect(res.unscheduled).toHaveLength(0);
      expect(res.totals.scheduled).toBe(1);
    });

    it('keeps a worker EXCUSED for the day out of the list whatever the target', async () => {
      // Leave does not care how the slot is described.
      setup(
        [worker('u1', UserRole.SATGAS)],
        [{ user_id: 'u1', status: ScheduleStatus.LEAVE_SICK, location_id: 'loc-b' }],
      );

      const res = await t.service.findUnscheduled('2026-07-23', { locationId: 'loc-a' });

      expect(res.unscheduled).toHaveLength(0);
      expect(res.unavailable.map((w) => w.id)).toEqual(['u1']);
    });

    it('matches the search against a TEAM the worker is scheduled on', async () => {
      // A team lives on the schedule, not on the person, so "Penyiraman" has to
      // reach through today's occurrences to find that crew.
      setup(
        [worker('u1', UserRole.SATGAS, 'Budi'), worker('u2', UserRole.SATGAS, 'Ani')],
        [
          {
            user_id: 'u1',
            status: ScheduleStatus.PLANNED,
            shift_definition_id: 'shift-2',
            team_category: { name: 'Tim Penyiraman' },
          },
        ],
      );

      const res = await t.service.findUnscheduled('2026-07-23', {
        shiftDefinitionId: 'shift-1',
        q: 'penyiraman',
      });

      expect(res.unscheduled.map((w) => w.id)).toEqual(['u1']);
      expect(res.unscheduled[0].teams).toEqual(['Tim Penyiraman']);
    });

    it('still matches the search on name and username', async () => {
      setup(
        [worker('u1', UserRole.SATGAS, 'Budi Santoso'), worker('u2', UserRole.SATGAS, 'Ani')],
        [],
      );

      const byName = await t.service.findUnscheduled('2026-07-23', { q: 'budi' });
      expect(byName.unscheduled.map((w) => w.id)).toEqual(['u1']);
      // `workforce` is the visible set; `matched` is what the search hit.
      expect(byName.totals.workforce).toBe(2);
      expect(byName.totals.matched).toBe(1);
    });

    it('drops a role outside the three schedulable ones instead of honouring it', async () => {
      const uqb = setup([worker('u1', UserRole.SATGAS)], []);

      // kepala_rayon is excluded outright (ADR-054 §4) — asking for it must not
      // widen the query, it must fall back to the schedulable three.
      await t.service.findUnscheduled('2026-07-23', { roles: [UserRole.KEPALA_RAYON] });

      expect(uqb.where).toHaveBeenCalledWith('u.role IN (:...roles)', {
        roles: [UserRole.SATGAS, UserRole.LINMAS, UserRole.KORLAP],
      });
    });

    it("narrows the WORKFORCE to the caller's own rayon (visibleDistrictId)", async () => {
      // The scope guard that silently broke: `districtId` describes the SLOT and
      // stopped narrowing people, so a kepala_rayon listed every rayon's workers.
      const uqb = setup([worker('u1', UserRole.SATGAS)], []);

      await t.service.findUnscheduled('2026-07-23', {
        districtId: 'ry-target',
        visibleDistrictId: 'ry-caller',
      });

      // The caller's rayon reaches the USER query...
      expect(uqb.andWhere).toHaveBeenCalledWith('u.district_id = :visibleDistrictId', {
        visibleDistrictId: 'ry-caller',
      });
      // ...and the target rayon does NOT.
      expect(uqb.andWhere).not.toHaveBeenCalledWith(
        'u.district_id = :visibleDistrictId',
        expect.objectContaining({ visibleDistrictId: 'ry-target' }),
      );
    });

    it('leaves the workforce unnarrowed for a globally-scoped caller', async () => {
      const uqb = setup([worker('u1', UserRole.SATGAS)], []);

      await t.service.findUnscheduled('2026-07-23', { districtId: 'ry-target' });

      expect(uqb.andWhere).not.toHaveBeenCalledWith(
        'u.district_id = :visibleDistrictId',
        expect.anything(),
      );
    });

    it('treats a BROADER assignment as already covering a narrower target', async () => {
      // A city-wide row covers every rayon. Demanding an exact column match
      // reported those workers as free for a place they were already committed
      // to, and collapsed `scheduled` to 0 for any geography-narrowed target.
      setup(
        [worker('u1', UserRole.SATGAS)],
        [{ user_id: 'u1', status: ScheduleStatus.PLANNED }], // city scope: no geography
      );

      const res = await t.service.findUnscheduled('2026-07-23', { districtId: 'ry1' });

      expect(res.unscheduled).toHaveLength(0);
      expect(res.totals.scheduled).toBe(1);
    });

    it('frees a REPLACED worker instead of counting them as scheduled', async () => {
      // Someone else took the shift, so they are the exact person this list is
      // for. `absent` stays busy — they hold the slot, they just did not show.
      setup(
        [worker('u1', UserRole.SATGAS), worker('u2', UserRole.SATGAS)],
        [
          { user_id: 'u1', status: ScheduleStatus.REPLACED, team_category: { name: 'Tim A' } },
          { user_id: 'u2', status: ScheduleStatus.ABSENT },
        ],
      );

      const res = await t.service.findUnscheduled('2026-07-23');

      expect(res.unscheduled.map((w) => w.id)).toEqual(['u1']);
      // ...and they are no longer tagged with the team they were replaced out of.
      expect(res.unscheduled[0].teams).toEqual([]);
      expect(res.totals.scheduled).toBe(1);
    });

    it('reports workforce as the VISIBLE set and matched as the searched subset', async () => {
      setup([worker('u1', UserRole.SATGAS, 'Budi'), worker('u2', UserRole.SATGAS, 'Ani')], []);

      const res = await t.service.findUnscheduled('2026-07-23', { q: 'budi' });

      // Reporting the search result as "workforce" made a 1-hit search read as
      // though the whole department were one person.
      expect(res.totals.workforce).toBe(2);
      expect(res.totals.matched).toBe(1);
    });

    it('reports the totals the button needs', async () => {
      setup(
        [
          worker('u1', UserRole.SATGAS),
          worker('u2', UserRole.LINMAS),
          worker('u3', UserRole.KORLAP),
        ],
        [
          { user_id: 'u2', status: ScheduleStatus.PLANNED },
          { user_id: 'u3', status: ScheduleStatus.LEAVE_SICK },
        ],
      );

      const res = await t.service.findUnscheduled('2026-07-23');

      expect(res.totals).toEqual({
        unscheduled: 1,
        unavailable: 1,
        scheduled: 1,
        workforce: 3,
        matched: 3,
      });
    });
  });

  describe('markPresentForClockIn (schedule-status-lifecycle)', () => {
    it('flips only the matching planned row to present', async () => {
      await t.service.markPresentForClockIn('u-1', '2026-07-26', 'sd-1');
      expect(t.rosterRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u-1',
          schedule_date: '2026-07-26',
          shift_definition_id: 'sd-1',
          status: ScheduleStatus.PLANNED,
        }),
        { status: ScheduleStatus.PRESENT },
      );
    });
  });

  describe('sweepAbsences (schedule-status-lifecycle)', () => {
    // Shift 1, 06:00–15:00, grace 60 → window closes 16:00 WIB.
    const plannedRow = (over: Partial<Record<string, unknown>> = {}) => ({
      id: 'r-1',
      user_id: 'u-1',
      schedule_date: '2026-07-26',
      shift_definition_id: 'sd-1',
      status: ScheduleStatus.PLANNED,
      shift_definition: {
        end_time: '15:00:00',
        crosses_midnight: false,
        cutoff_grace_min: 60,
      },
      ...over,
    });

    // -----------------------------------------------------------------------
    // Lookback bound. Unbounded, the FIRST sweep on a database that has never
    // run ADR-056 rewrites the whole backlog in one transaction — on staging
    // that is tens of thousands of rows on the first cron tick after cutover.
    // -----------------------------------------------------------------------
    describe('lookback bound', () => {
      it('queries a bounded date window by default, not all of history', async () => {
        t.rosterRepo.find.mockResolvedValue([]);
        await t.service.sweepAbsences(new Date('2026-07-26T20:00:00Z'));

        const where = t.rosterRepo.find.mock.calls[0][0].where;
        // Between(from, to) rather than LessThanOrEqual(today).
        expect(where.schedule_date?._type).toBe('between');
      });

      it('honours an explicit lookback, in WIB days', async () => {
        // Midday WIB on the 26th (05:00Z), deliberately: `now` is a REAL instant
        // and the window is expressed in WIB calendar days, so an evening-UTC
        // value like 20:00Z is already the NEXT WIB day and would make the
        // expected dates non-obvious.
        t.rosterRepo.find.mockResolvedValue([]);
        await t.service.sweepAbsences(new Date('2026-07-26T05:00:00Z'), 3);

        const where = t.rosterRepo.find.mock.calls[0][0].where;
        expect(where.schedule_date?._value?.[0]).toBe('2026-07-23');
        expect(where.schedule_date?._value?.[1]).toBe('2026-07-26');
      });

      it('rolls "today" to the next WIB day for a late-UTC instant', () => {
        // 20:00Z on the 26th is 03:00 WIB on the 27th. Getting this wrong is how
        // the two time conventions used to bite.
        expect(TimezoneUtil.jakartaDateString(new Date('2026-07-26T20:00:00Z'))).toBe('2026-07-27');
      });

      it('treats lookback 0 as an explicit, unbounded backfill', async () => {
        t.rosterRepo.find.mockResolvedValue([]);
        await t.service.sweepAbsences(new Date('2026-07-26T20:00:00Z'), 0);

        const where = t.rosterRepo.find.mock.calls[0][0].where;
        expect(where.schedule_date?._type).toBe('lessThanOrEqual');
      });
    });

    it('marks a past no-show absent (window closed, no session)', async () => {
      t.rosterRepo.find.mockResolvedValue([plannedRow()]);
      t.shiftRepo.find.mockResolvedValue([]); // no session → never clocked in
      const now = new Date('2026-07-26T20:00:00Z'); // past 16:00 WIB close

      const res = await t.service.sweepAbsences(now);

      expect(res).toEqual({ absent: 1, present: 0 });
      expect(t.rosterRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: ScheduleStatus.PLANNED }),
        { status: ScheduleStatus.ABSENT },
      );
    });

    it('self-heals to present when a session exists', async () => {
      t.rosterRepo.find.mockResolvedValue([plannedRow()]);
      // A matching non-overtime session → they clocked in (self-heal to present).
      t.shiftRepo.find.mockResolvedValue([
        { user_id: 'u-1', service_day: '2026-07-26', shift_definition_id: 'sd-1' },
      ]);
      const now = new Date('2026-07-26T20:00:00Z');

      const res = await t.service.sweepAbsences(now);

      expect(res).toEqual({ absent: 0, present: 1 });
      expect(t.rosterRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: ScheduleStatus.PLANNED }),
        { status: ScheduleStatus.PRESENT },
      );
    });

    it('leaves a row whose window is still open untouched', async () => {
      t.rosterRepo.find.mockResolvedValue([plannedRow()]);
      const now = new Date('2026-07-26T09:00:00Z'); // shift still running

      const res = await t.service.sweepAbsences(now);

      expect(res).toEqual({ absent: 0, present: 0 });
      expect(t.rosterRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('isShiftWindowClosed (pure)', () => {
    it('is closed only after end_time + grace (WIB)', () => {
      const args = ['2026-07-26', '15:00:00', false, 60] as const;
      expect(isShiftWindowClosed(...args, new Date('2026-07-26T15:30:00Z'))).toBe(false); // in grace
      expect(isShiftWindowClosed(...args, new Date('2026-07-26T16:30:00Z'))).toBe(true); // past grace
    });

    it('rolls a crossing shift end into the next day', () => {
      // Shift 3, 21:00–05:00 (crosses), grace 60 → closes 06:00 next day.
      const args = ['2026-07-26', '05:00:00', true, 60] as const;
      expect(isShiftWindowClosed(...args, new Date('2026-07-27T05:30:00Z'))).toBe(false); // in grace
      expect(isShiftWindowClosed(...args, new Date('2026-07-27T06:30:00Z'))).toBe(true); // past grace
    });
  });
});
