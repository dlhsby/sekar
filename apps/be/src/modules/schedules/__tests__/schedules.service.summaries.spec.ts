import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TimezoneUtil } from '../../../common/utils/timezone.util';
import { ScheduleStatus } from '../entities/schedule.entity';
import { UserRole } from '../../users/entities/user.entity';
import { isShiftWindowClosed } from '../schedules.service';
import { ADMIN, setupSchedulesTestbed } from './schedules.testbed';

/**
 * Aggregates — see `schedules.summaries.ts`.
 *
 * The day board's and the week/month grids' numbers (ADR-057). Their totals must
 * equal what `/schedules/range` would list for the same range.
 *
 * Split out of the 2,163-line `schedules.service.spec.ts`; all four files share
 * one testbed so the mocks cannot drift between them.
 */
const t = setupSchedulesTestbed();

describe('SchedulesService — aggregates', () => {
  // ---------------------------------------------------------------------------
  // getDaySummary — the collapsed day board, as counts.
  //
  // Its numbers have to equal what `/schedules/range` would list for the same
  // day. The dangerous half is PROJECTION: past the materialization horizon a day
  // holds no rows at all, only occurrences an event will produce, so a summary
  // that counted rows alone reported "0 petugas" for a day the board could open
  // and list 1,009 people in.
  // ---------------------------------------------------------------------------
  describe('SchedulesService.getDaySummary', () => {
    it('counts projected occurrences, not just materialized rows', async () => {
      const svc = t.service as unknown as {
        getDaySummary: (
          d: string,
          f?: unknown,
        ) => Promise<{
          groups: Array<{ total: number; role: string; location_id: string | null }>;
          workers: { city: number; locations: Array<{ id: string; workers: number }> };
        }>;
        projectOccurrences: jest.Mock;
      };
      // No materialized rows for this day — everything is a projection.
      t.rosterRepo.qb.getRawMany.mockResolvedValue([]);
      svc.projectOccurrences = jest.fn().mockResolvedValue([
        {
          user_id: 'w1',
          district_id: 'ry1',
          region_id: null,
          location_id: 'loc1',
          shift_definition_id: 's1',
          schedule_event_id: 'e1',
          user: { role: 'satgas' },
        },
        {
          user_id: 'w2',
          district_id: 'ry1',
          region_id: null,
          location_id: 'loc1',
          shift_definition_id: 's1',
          schedule_event_id: 'e1',
          user: { role: 'satgas' },
        },
      ]);
      // The t.service's `t.locationRepo` is provided as `t.areaEntityRepo` here.
      t.areaEntityRepo.find.mockResolvedValue([{ id: 'loc1', region_id: 'kw1' }]);

      const summary = await svc.getDaySummary('2026-10-15');

      expect(summary.groups).toEqual([
        expect.objectContaining({ location_id: 'loc1', role: 'satgas', total: 2 }),
      ]);
      expect(summary.workers.city).toBe(2);
      expect(summary.workers.locations).toEqual([{ id: 'loc1', workers: 2 }]);
    });

    it("rolls a lokasi's people up into its kawasan, which the row itself never names", async () => {
      // A static row carries no `region_id` — only the lokasi knows its kawasan.
      // Getting this wrong zeroed every kawasan headcount on a projected day.
      const svc = t.service as unknown as {
        getDaySummary: (
          d: string,
        ) => Promise<{ workers: { regions: Array<{ id: string; workers: number }> } }>;
        projectOccurrences: jest.Mock;
      };
      t.rosterRepo.qb.getRawMany.mockResolvedValue([
        {
          user_id: 'w1',
          district_id: 'ry1',
          region_id: null,
          location_id: 'loc1',
          shift_definition_id: 's1',
          schedule_event_id: null,
          role: 'satgas',
        },
      ]);
      svc.projectOccurrences = jest.fn().mockResolvedValue([]);
      // The t.service's `t.locationRepo` is provided as `t.areaEntityRepo` here.
      t.areaEntityRepo.find.mockResolvedValue([{ id: 'loc1', region_id: 'kw1' }]);

      const summary = await svc.getDaySummary('2026-07-08');
      expect(summary.workers.regions).toEqual([{ id: 'kw1', workers: 1 }]);
    });

    // A day-off row carries NO shift. `groupByShift` on the client buckets by
    // the known shift ids, so such a row was never renderable and never counted
    // — until the summary tallied straight from SQL and started including them.
    // Measured on the 2026-08-01 clone: every card claimed 1 087 petugas where
    // 1 023 were actually on shift, and one worker whose only row was a
    // city-scope day-off appeared in the Surabaya total but on no card below it.
    it('excludes day-off rows, which carry no shift and render nowhere', async () => {
      const svc = t.service as unknown as {
        getDaySummary: (d: string) => Promise<unknown>;
        projectOccurrences: jest.Mock;
      };
      t.rosterRepo.qb.getRawMany.mockResolvedValue([]);
      svc.projectOccurrences = jest.fn().mockResolvedValue([]);
      t.areaEntityRepo.find.mockResolvedValue([]);

      await svc.getDaySummary('2026-08-01');

      expect(t.rosterRepo.qb.andWhere).toHaveBeenCalledWith('ds.shift_definition_id IS NOT NULL');
    });
  });

  // ---------------------------------------------------------------------------
  // getRangeSummary — the week and month grids, as counts.
  //
  // Same trap as the day summary, one dimension larger. Plus one of its own:
  // `getRawMany` hands back `date` columns as JS **Date objects**, and keying a
  // Map on one uses object identity — an unfiltered month produced 48,954
  // "days" of one worker each instead of 35.
  // ---------------------------------------------------------------------------
  describe('SchedulesService.getRangeSummary', () => {
    type Svc = {
      getRangeSummary: (
        f: string,
        t: string,
      ) => Promise<{
        days: Array<{ date: string; workers: number }>;
        dayDistricts: Array<{ date: string; district_id: string; workers: number }>;
        cells: Array<{
          date: string;
          district_id: string;
          shift_definition_id: string | null;
          total: number;
          teams: number;
          roleCounts: Record<string, number>;
        }>;
      }>;
      projectOccurrences: jest.Mock;
    };

    const tuple = (o: Record<string, unknown>) => ({
      user_id: 'w1',
      schedule_date: '2026-07-13',
      district_id: 'ry1',
      region_id: null,
      location_id: 'loc1',
      shift_definition_id: 's1',
      schedule_event_id: null,
      is_team: false,
      role: 'satgas',
      ...o,
    });

    beforeEach(() => {
      t.areaEntityRepo.find.mockResolvedValue([
        { id: 'loc1', district_id: 'ry1', region_id: 'kw1' },
      ]);
      t.rosterRepo.manager.query.mockResolvedValue([{ id: 'kw1', district_id: 'ry1' }]);
      (t.service as unknown as Svc).projectOccurrences = jest.fn().mockResolvedValue([]);
    });

    it('groups by CALENDAR DAY even when the driver returns Date objects', async () => {
      // Two rows on the same day, handed back as distinct Date instances.
      t.rosterRepo.qb.getRawMany.mockResolvedValue([
        tuple({ user_id: 'w1', schedule_date: new Date('2026-07-13T00:00:00Z') }),
        tuple({ user_id: 'w2', schedule_date: new Date('2026-07-13T00:00:00Z') }),
      ]);

      const summary = await (t.service as unknown as Svc).getRangeSummary(
        '2026-07-13',
        '2026-07-13',
      );

      // ONE day, two people — not two days of one.
      expect(summary.days).toEqual([{ date: '2026-07-13', workers: 2 }]);
    });

    it('counts a person once per cell, and lets a team assignment win', async () => {
      t.rosterRepo.qb.getRawMany.mockResolvedValue([
        // Same worker, same cell, twice — two places in one shift (ADR-053).
        tuple({ user_id: 'w1', location_id: 'loc1' }),
        tuple({ user_id: 'w1', location_id: 'loc1', is_team: true }),
        tuple({ user_id: 'w2' }),
      ]);

      const summary = await (t.service as unknown as Svc).getRangeSummary(
        '2026-07-13',
        '2026-07-13',
      );

      const cell = summary.cells[0];
      expect(cell.total).toBe(2);
      // w1 is on a team, so it is not also counted under its role.
      expect(cell.teams).toBe(1);
      expect(cell.roleCounts).toEqual({ satgas: 1 });
      expect(summary.dayDistricts).toEqual([
        { date: '2026-07-13', district_id: 'ry1', workers: 2 },
      ]);
    });

    it('includes projected occurrences, so a far-future week is not empty', async () => {
      t.rosterRepo.qb.getRawMany.mockResolvedValue([]);
      (t.service as unknown as Svc).projectOccurrences = jest.fn().mockResolvedValue([
        {
          user_id: 'p1',
          schedule_date: '2026-11-20',
          district_id: 'ry1',
          region_id: null,
          location_id: 'loc1',
          shift_definition_id: 's1',
          schedule_event_id: 'e1',
          team_category_id: null,
          user: { role: 'satgas' },
        },
      ]);

      const summary = await (t.service as unknown as Svc).getRangeSummary(
        '2026-11-20',
        '2026-11-20',
      );
      expect(summary.days).toEqual([{ date: '2026-11-20', workers: 1 }]);
      expect(summary.cells[0].total).toBe(1);
    });
  });
});
